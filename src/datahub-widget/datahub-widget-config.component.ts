/*
* Copyright (c) 2020 Software AG, Darmstadt, Germany and/or its licensors
*
* SPDX-License-Identifier: Apache-2.0
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*    http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
 */

import {Component, Input, OnDestroy} from '@angular/core';
import {
    catchError,
    concatMap,
    filter,
    map,
    mapTo,
    scan,
    startWith,
    switchMap,
    tap
} from "rxjs/operators";
import {EMPTY, from, interval, Subject, Subscription} from "rxjs";
import {Job, JobStatus, QueryService} from "./query.service";
import {AlertService} from "@c8y/ngx-components";

export interface IDatahubWidgetConfig {
    queryString: string,
    tablePath: string,
    refreshPeriod: number,
    columns: {
        colName: string,
        displayName: string,
        visibility: 'visible' | 'hidden'
    }[]
}

interface DremioTableDescription {
    TABLE_CATALOG: string,
    TABLE_SCHEMA: string,
    TABLE_NAME: string,
    TABLE_TYPE: string
}

@Component({
    templateUrl: './datahub-widget-config.component.html'
})
export class DatahubWidgetConfig implements OnDestroy {
    _config: IDatahubWidgetConfig = {
        queryString: '',
        tablePath: '',
        refreshPeriod: 60000,
        columns: []
    };
    querySubject = new Subject<string>()
    subscriptions = new Subscription();
    tablesBySchema: Promise<{ [schemaName: string]: DremioTableDescription[] }>;

    @Input() set config(config: IDatahubWidgetConfig) {
        this._config = Object.assign(config, {
            ...this._config,
            ...config
        });
    };
    get config(): IDatahubWidgetConfig {
        return this._config
    }

    constructor(private queryService: QueryService, private alertService: AlertService) {
        this.subscriptions.add(
            this.querySubject
                .pipe(
                    // Filter out any blank or undefined queries
                    filter(query => !!query),
                    // Re-query every refreshPeriod to refresh the data
                    switchMap(val => interval(this.config.refreshPeriod).pipe(mapTo(val), startWith(val))),
                    // Start the job - Keep the responses in order by using concatMap
                    concatMap(query => from(this.queryService.postQuery(query))),
                    // Cancel the previous job if we get a new one
                    scan((previousJob, job) => {
                        // Ignore the result - if we can't cancel the query it has probably finished already
                        this.queryService.cancelJob(previousJob.id).catch(e => console.debug("Query cancellation failed", e));
                        return job;
                    }),
                    // Wait for the job to complete - erroring if it does not complete successfully
                    switchMap(job => this.queryService.waitForJobToComplete$(job.id).pipe(
                        map(jobStatus => {
                            if (jobStatus.jobState === 'COMPLETED') {
                                return [job, jobStatus] as [Job, JobStatus];
                            } else if (jobStatus.errorMessage) {
                                throw new Error(`Query job failed: ${jobStatus.errorMessage}`);
                            } else {
                                throw new Error("Query job failed");
                            }
                        })
                    )),
                    // Get the schema - we don't care about the data (hence the limit: 0)
                    switchMap(([job]) => from(this.queryService.getJobResults(job.id, 0, 0))),
                    // Show the user the error - there might be information about why their query didn't work
                    tap({error: e => this.showError(e)}),
                    // Handle errors by doing nothing - the user can trigger another query by editing or clicking refresh
                    catchError(() => EMPTY)
                )
                .subscribe(result => {
                    // Read the schema from the results set and convert it for use in the config (for change the headings, hiding columns...)
                    this.config.columns = result.schema
                        .map(column => column.name)
                        .map(colName => {
                            let matchingColumn = this.config.columns.find(col => col.colName == colName);
                            if (matchingColumn) {
                                return matchingColumn;
                            } else {
                                return {
                                    colName,
                                    displayName: this.niceName(colName),
                                    visibility: 'visible'
                                };
                            }
                        });
                })
        );
        this.tablesBySchema = this.getTablesBySchema();
        if (this.config.columns.length == 0) {
            this.updateColumnDefinitions();
        }
    }

    /**
     * Finds a list of table names, grouped by their schemaName
     */
    async getTablesBySchema(): Promise<{ [schemaName: string]: DremioTableDescription[] }> {
        try {
            const res = await this.queryService.queryForResults<DremioTableDescription>(`select * from INFORMATION_SCHEMA."TABLES"`, {timeout: this.config.refreshPeriod})
            // Group the tables by their TABLE_SCHEMA, so that we can display them in groups
            return res.rows
                // Filter out the sys tables - the user won't have access to read them
                .filter(table => table.TABLE_SCHEMA.split('.')[0] !== 'sys')
                // Filter out the INFORMATION_SCHEMA - the user probably isn't looking for this (They can still query it manually if they want to)
                .filter(table => table.TABLE_SCHEMA !== 'INFORMATION_SCHEMA')
                // Group the tables by their schema name
                .reduce((acc, table) => {
                    if (!acc[table.TABLE_SCHEMA]) {
                        acc[table.TABLE_SCHEMA] = [];
                    }
                    acc[table.TABLE_SCHEMA].push(table);
                    return acc;
                }, {});
        } catch (e) {
            this.showError(e);
            return {};
        }
    }

    updateColumnDefinitions() {
        this.config.columns = [];
        this.querySubject.next(this.config.queryString);
    }

    niceName(value: string): string {
        return value
            // Convert underscores and dashes to spaces
            .replace(/[-_]/g, " ")
            // Put a space between camel cased letters
            .replace(/([^A-Z\s])(?=[A-Z])/g, "$1 ")
            // Remove any duplicate spaces
            .replace(/\s+/g, " ")
            // Remove spaces from the start and end
            .trim();
    }

    updateQueryForTableSelection(tablePath: string) {
        this.config.queryString = `select * from ${tablePath}`;
        this.updateColumnDefinitions();
    }

    tablePath(table: DremioTableDescription): string {
        return `"${table.TABLE_SCHEMA}"."${table.TABLE_NAME}"`;
    }

    showError(msg: string, e?: Error | unknown) {
        console.error(msg, e);
        if (e instanceof Error || (e && e.hasOwnProperty("errorMessage"))) {
            this.alertService.danger(msg, (e as any).errorMessage);
        } else {
            this.alertService.danger(msg);
        }
    }

    ngOnDestroy() {
        this.subscriptions.unsubscribe();
    }
}
