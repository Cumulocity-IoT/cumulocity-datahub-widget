import { Injectable, OnInit } from "@angular/core";
import { IAlarm } from "@c8y/client";
import { QueryService } from './query.service';


interface QueryConfig {
    timeout?: number
}

export type DatasetFieldType = "STRUCT" | "LIST" | "UNION" | "INTEGER" | "BIGINT" | "FLOAT" | "DOUBLE" | "VARCHAR" | "VARBINARY" | "BOOLEAN" | "DECIMAL" | "TIME" | "DATE" | "TIMESTAMP" | "INTERVAL DAY TO SECOND" | "INTERVAL YEAR TO MONTH";
export interface DatasetField {
    name: string,
    type: {
        name: DatasetFieldType,
        subSchema?: DatasetField,
        precision?: number,
        scale?: number
    }
}
export interface JobResult<T> {
    rowCount: Number,
    schema: DatasetField[],
    rows: T[]
}


@Injectable()
export class QueryWrapperService {

    constructor(private queryService: QueryService) { }

    async queryForResults<T = any>(queryString: string, config?: QueryConfig): Promise<JobResult<T>> {
        //receive query String

        //post job
        const jobId = await this.postQuery(queryString);

        //wait for result
        //return result
        return await this.waitForJobResults(jobId);

        //handle errors
        //retry until timeout reached
        throw Error("not implmented")

    }

    async getAlarms(): Promise<IAlarm[]> {
        throw Error("not implmented")
    }

    async postQuery(query: string): Promise<string> {
        const response = await this.queryService.postQuery(JSON.stringify({ sql: query }));
        return response.id.toString();
    }

    //move to query.service
    async getJobState(jobId: string): Promise<string> {
        const response = await this.queryService.getJobState(jobId);
        if (response.errorMessage) {
            console.error(response.errorMessage);
        }
        return response.jobState;
    }

    //add timeout
    //If error state then throw
    async waitForJobResults<T>(jobId: string): Promise<JobResult<T>> {
        let jobState = await this.getJobState(jobId);
        while (["RUNNING", "ENQUEUED"].includes(jobState)) {
            await this.sleep(500);
            jobState = await this.getJobState(jobId);
        }
        return this.getJobResults(jobId);
    }

    async getJobResults<T>(jobId: string): Promise<JobResult<T>> {
        return this.queryService.getJobResults(jobId);
    }

    sleep(milliseconds) {
        return new Promise(resolve => setTimeout(resolve, milliseconds));
    }
}