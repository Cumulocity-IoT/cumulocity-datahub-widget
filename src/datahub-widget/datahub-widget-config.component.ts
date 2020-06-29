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
import {filter, retry, switchMap, tap} from "rxjs/operators";
import {from, Subject, Subscription} from "rxjs";
import {QueryService} from "./query.service";
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
    template: `
        <div class="form-group">
            <c8y-form-group>
                <label translate>Table</label>
                <select [(ngModel)]="config.tablePath" (ngModelChange)="updateQueryForTableSelection($event)"
                        *ngIf="tablesBySchema | async as tableSchemas else loadingTableList">
                    <ng-container>
                        <optgroup *ngFor="let tableSchema of tableSchemas | keyvalue" [label]="tableSchema.key">
                            <option *ngFor="let table of tableSchema.value"
                                    [ngValue]="tablePath(table)">{{table.TABLE_NAME}}</option>
                        </optgroup>
                    </ng-container>
                </select>
                <ng-template #loadingTableList>
                    <select disabled="true">
                        <option>Loading...</option>
                    </select>
                </ng-template>
            </c8y-form-group>
            <c8y-form-group>
                <label translate>SQL Statement</label>
                <textarea class="form-control" [(ngModel)]="config.queryString"
                          (change)="updateColumnDefinitions()"></textarea>
            </c8y-form-group>
            <c8y-form-group>
                <label translate>Refresh Period (Seconds)</label>
                <input class="form-control" type="number" min="1" step="1" [ngModel]="config.refreshPeriod / 1000" (ngModelChange)="config.refreshPeriod = $event * 1000"/>
            </c8y-form-group>
            <table class="table">
                <colgroup>
                    <col style="width: 4em">
                    <col style="width: 4em">
                </colgroup>
                <thead>
                <button (click)="updateColumnDefinitions()">Refresh</button>
                <tr>
                    <th>Visible</th>
                    <th>Datahub Column</th>
                    <th>Label</th>
                </tr>
                </thead>
                <tbody>
                <ng-container *ngIf="config.columns?.length > 0 else loadingColumns">
                    <tr *ngFor="let col of config.columns">
                        <td>
                            <div class="checkbox">
                                <input type="checkbox" [checked]="col.visibility == 'visible'"
                                       (change)="col.visibility = $any($event.target).checked ? 'visible' : 'hidden'">
                            </div>
                        </td>
                        <td style="text-align: right;">{{col.colName}}</td>
                        <td><input class="form-control" [(ngModel)]="col.displayName"/></td>
                    </tr>
                </ng-container>
                <ng-template #loadingColumns>
                    <tr>
                        <td colspan="3">Loading...</td>
                    </tr>
                </ng-template>
                </tbody>
            </table>
        </div>`
})
export class DatahubWidgetConfig implements OnDestroy {
    _config: IDatahubWidgetConfig = {
        queryString: '',
        tablePath: '',
        refreshPeriod: 60000,
        columns: []
    };

    @Input() set config(config: IDatahubWidgetConfig) {
        this._config = Object.assign(config, {
            ...this._config,
            ...config
        });
    };
    get config(): IDatahubWidgetConfig {
        return this._config
    }

    querySubject = new Subject<string>()
    subscriptions = new Subscription();

    tablesBySchema: Promise<{
        [schemaName: string]: DremioTableDescription[]
    }>;

    constructor(private queryService: QueryService, private alertService: AlertService) {
        this.subscriptions.add(
            this.querySubject
                .pipe(
                    filter(query => !!query),
                    switchMap(query => from(this.queryService.queryForResults(query, {timeout: this.config.refreshPeriod}))),
                    tap({error: e => this.showError(e)}),
                    retry()
                )
                .subscribe(result => {
                    this.config.columns = result.schema
                        .map(column => column.name)
                        .map(colName => {
                            let matchingColumn = this.config.columns.find(col => col.colName == colName);
                            if (matchingColumn) {
                                return matchingColumn;
                            } else {
                                return {
                                    colName,
                                    displayName: this.formatHeading(colName),
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

    async getTablesBySchema(): Promise<{ [schemaName: string]: DremioTableDescription[] }> {
        try {
            const res = await this.queryService.queryForResults<DremioTableDescription>(`select * from INFORMATION_SCHEMA."TABLES"`, {timeout: this.config.refreshPeriod})
            // Group the tables by their TABLE_SCHEMA, so that we can display them in groups
            return res.rows
                // Filter out the sys tables - the user won't have access to read them
                .filter(table => table.TABLE_SCHEMA.split('.')[0] !== 'sys')
                // Filter out the INFORMATION_SCHEMA - the user probably isn't looking for this (They can still query it manually if they want to)
                .filter(table => table.TABLE_SCHEMA !== 'INFORMATION_SCHEMA')
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

    formatHeading(value: string): string {
        return value.replace(/_/g, " ").replace(/([^A-Z\s])(?=[A-Z])/g, "$1 ").replace(/\s+/g, " ");
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
        if (e instanceof Error || (e && e.hasOwnProperty("message"))) {
            this.alertService.danger(msg, (e as any).errorMessage);
        } else {
            this.alertService.danger(msg);
        }
    }

    ngOnDestroy() {
        this.subscriptions.unsubscribe();
    }
}
