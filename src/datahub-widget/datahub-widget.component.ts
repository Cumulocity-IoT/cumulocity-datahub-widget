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

import {Component, HostListener, Input, OnDestroy, ViewChild} from '@angular/core';
import {BehaviorSubject, from, interval, Subscription} from "rxjs";
import {
    concatMap,
    delay,
    filter,
    map,
    mapTo,
    retryWhen, scan,
    startWith,
    switchMap
} from "rxjs/operators";
import {IDatahubWidgetConfig} from "./datahub-widget-config.component";
import {Job, JobStatus, QueryService} from "./query.service";
import {ColumnMode, DatatableComponent} from '@swimlane/ngx-datatable';
import { DashboardChildComponent } from '@c8y/ngx-components';

interface PageInfo {
    offset: number;
    pageSize: number;
    limit: number;
    count: number;
}

@Component({
    templateUrl: './datahub-widget.component.html',
    styles: [ `
        .ngx-datatable.scroll-vertical {
            height: 100%;
        }
        .ngx-datatable.material >>> .datatable-header .datatable-header-cell .resize-handle {
            height: 100%;
        }
        .ngx-datatable.material >>> .datatable-header .datatable-header-cell {
            padding: 1.9rem 1.2rem;
        }
    ` ]
})
export class DatahubWidgetComponent implements OnDestroy {
    _config: IDatahubWidgetConfig = {
        queryString: '',
        tablePath: '',
        refreshPeriod: 60000,
        columns: []
    };
    ColumnMode = ColumnMode;
    subscriptions = new Subscription();
    querySubject = new BehaviorSubject<undefined | string>(undefined);
    cols: { prop?: string, name: string, sortable?: boolean }[];
    rows: {[colName: string]: any}[] = [];
    currentJob: Job;
    totalRowCount: number = 0;
    pageInfo: PageInfo;
    pagesLoading = 0;

    @Input() set config(config: IDatahubWidgetConfig) {
        this._config = Object.assign(config, {
            ...this._config,
            ...config
        });
        this.querySubject.next(this.config.queryString);
        this.cols = this.config.columns
            .filter(col => col.visibility == 'visible')
            .map(col => ({
                prop: col.colName,
                name: col.displayName,
                sortable: false
            }));
    };
    get config(): IDatahubWidgetConfig {
        return this._config
    }

    @ViewChild(DatatableComponent, {static: true}) table: DatatableComponent;

    @HostListener('window:resize')
    onResize() {
        if (this.table) {
            setTimeout(() => this.table.recalculate(), 100);
        }
    }

    constructor(private queryService: QueryService, private container: DashboardChildComponent) {
        // Widget was resized manually
        this.container.changeEnd.subscribe((change: DashboardChildComponent) => this.onResize());

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
                    // Handle errors by retrying
                    retryWhen(e => e.pipe(delay(this.config.refreshPeriod)))
                )
                .subscribe(([job, jobStatus]) => {
                    // We have a new job that has completed successfully

                    // We're using virtual paging so need to know the total number of rows
                    this.totalRowCount = jobStatus.rowCount || 0;
                    this.rows = new Array(this.totalRowCount);
                    this.currentJob = job;
                    this.pagesLoading = 0;
                    this.setPage(this.pageInfo);
                })
        );
    }

    setPage(pageInfo: PageInfo) {
        this.pageInfo = pageInfo;

        const pageNumber = this.pageInfo.offset;
        const pageSize = this.pageInfo.pageSize;

        // We also load the previous/next page so that scrolling isn't too slow and so that refreshes don't mess up when on a boundary
        const pageStart = pageNumber * pageSize;
        const previousPageStart = (pageNumber - 1) * pageSize;
        const nextPageStart = (pageNumber + 1) * pageSize;

        const loadPage = !this.areRowsLoaded(pageStart, pageSize);
        const loadPreviousPage = pageNumber > 0 && !this.areRowsLoaded(previousPageStart, pageSize);
        const loadNextPage = this.totalRowCount > nextPageStart && !this.areRowsLoaded(nextPageStart, pageSize);

        const start = loadPreviousPage ? previousPageStart : loadPage ? pageStart : nextPageStart;
        const count = loadPreviousPage ?
            loadNextPage ?
                pageSize * 3
                : loadPage ? pageSize * 2 : pageSize
            : loadPage ?
                loadNextPage ?
                    pageSize * 2 : pageSize
                : loadNextPage ? pageSize : 0;

        if (count > 0) {
            this.loadRows(start, count)
                .catch(e => console.error(e));
        }
    }

    areRowsLoaded(start: number, count: number, includeLoadingRows: boolean = true) {
        // hole means row not loaded, undefined means loading, and a value mean it is loaded
        for (let i = start; i < start + count; i ++) {
            if (!this.rows.hasOwnProperty(i)) { // Check for hole
                return false;
            } else if (!includeLoadingRows && !this.rows[i]) { // Check for undefined
                return false;
            }
        }
        return true;
    }

    async loadRows(start: number, count: number) {
        if (!this.currentJob) return;

        // Store the job we are working on - by the time we get the results back it might have changed
        const job = this.currentJob;

        this.pagesLoading++;

        // Mark the rows as loading (So that they aren't loaded twice)
        for (let i = start; i <= start + count && i < this.rows.length; i++) {
            // undefined means loading
            this.rows[i] = this.rows[i] || undefined;
        }

        const results = await this.queryService.getJobResults(job.id, start, count);

        // Check that the job hasn't changed since we started loading the page, if it has then these results are stale
        if (job.id !== this.currentJob.id) return;

        // Clone the rows array - change detection assumes that the objects + arrays are immutable
        const rows = this.rows.slice();
        // Add the new items
        rows.splice(start, results.rows.length, ...results.rows);
        // Update the list of rows
        this.rows = rows;

        // Check if dremio/datahub actually returned all the rows we wanted, if not then request the rows that were missed
        if (
            results.rows.length < count         // Did datahub miss any expected rows?
            && start + count < this.rows.length // Were we actually expecting these rows?
            && results.rows.length > 0          // Did it just return 0 rows? - if so then there's probably something else wrong (maybe the rowCount is currently wrong)
            && !this.areRowsLoaded(start + results.rows.length, count - results.rows.length, false)     // Have we already loaded these rows?
        ) {
            console.debug(`DataHub didn't provide ${count - results.rows.length} rows, requesting missing rows...`)
            await this.loadRows(start + results.rows.length, count - results.rows.length);
        }

        this.pagesLoading--;
    };

    ngOnDestroy() {
        this.subscriptions.unsubscribe();
    }
}
