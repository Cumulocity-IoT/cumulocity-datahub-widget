import { Injectable, Injector } from '@angular/core';
import { FetchClient } from '@c8y/ngx-components/api';
import { IFetchOptions } from '@c8y/client';

export interface QueryConfig {
  timeout: number,
  offset: number,
  limit: number
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

@Injectable({ providedIn: 'root' })
export class QueryService {
  private readonly dataHubDremioApi = '/service/datahub/dremio/api/v3';
  private readonly fetchClient: FetchClient;

  private fetchOptions: IFetchOptions = {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  };

  constructor(injector: Injector) {
    // Cumulocity won't let you inject this if your @Injectable is provided in root... so this is a workaround..
    this.fetchClient = injector.get(FetchClient);
  }

  async queryForResults<T = any>(queryString: string, config: Partial<QueryConfig> = {}): Promise<JobResult<T>> {
    //post job to api
    const job = await this.postQuery(JSON.stringify({ sql: queryString }));
    const jobId = job.id.toString();

    //define timeout
    let timeoutTime: number = Number.POSITIVE_INFINITY;
    if (config.timeout) { timeoutTime = Date.now() + config.timeout; }

    let jobState = await this.getJobState(jobId);
    while (["RUNNING", "ENQUEUED"].includes(jobState)) {
        if (timeoutTime && (Date.now() > timeoutTime)) {
            throw new Error("Timed out");
        }
        await this.sleep(500);
        jobState = await this.getJobState(jobId);
    }
    return await this.getJobResults(jobId, config);
}

  async getJobState(jobId) {
    const response = await this.fetchClient.fetch(`${this.dataHubDremioApi}/job/${jobId}`, this.fetchOptions);
    if (response.status >= 200 && response.status < 300) {
      return response.json();
    } else {
      throw new Error(await response.text());
    }
  }

  async getJobResults(jobId, config: Partial<QueryConfig> = {}) {
    const fullConfig: QueryConfig = { timeout: Number.POSITIVE_INFINITY, offset: 0, limit: 100, ...config };
    const response = await this.fetchClient.fetch(`${this.dataHubDremioApi}/job/${jobId}/results?offset=${fullConfig.offset}&limit=${fullConfig.limit}`, this.fetchOptions)
    if (response.status >= 200 && response.status < 300) {
      return response.json();
    } else {
      throw new Error(await response.text());
    }
  }

  async postQuery(query: String): Promise<any> {
    const response = await this.fetchClient.fetch(this.dataHubDremioApi + '/sql', { ...this.fetchOptions, method: 'POST', body: query })
    if (response.status >= 200 && response.status < 300) {
      return response.json();
    } else {
      throw new Error(await response.text());
    }
  }

  sleep(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
}
}
