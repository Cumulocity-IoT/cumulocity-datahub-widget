import { Injectable } from "@angular/core";
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
        //post job
        const jobId = await this.postQuery(queryString);

        //wait for result
        try {
            if (config.timeout) {
                console.log("config.timeout: " + config.timeout);
                return await this.waitForJobResults(jobId, config.timeout);
            } else {
                return await this.waitForJobResults(jobId);
            }
        } catch (e) {
            throw e;
        }
    }

    async getAlarms(): Promise<IAlarm[]> {
        throw Error("not implmented")
    }

    async postQuery(query: string): Promise<string> {
        const response = await this.queryService.postQuery(JSON.stringify({ sql: query }));
        return response.id.toString();
    }

    async waitForJobResults<T>(jobId: string, timeout?: number): Promise<JobResult<T>> {
        if (timeout) { var timeoutTime = Date.now() + timeout; }
        let jobState = await this.queryService.getJobState(jobId);
        try {
            while (["RUNNING", "ENQUEUED"].includes(jobState)) {
                if (timeout && (Date.now() > timeoutTime)) {
                    throw new Error("Timed out");
                }
                console.log("pending...");
                await this.sleep(500);
                jobState = await this.queryService.getJobState(jobId);
            }
            return await this.queryService.getJobResults(jobId);
        } catch (e) {
            throw e;
        }
    }

    sleep(milliseconds) {
        return new Promise(resolve => setTimeout(resolve, milliseconds));
    }
}