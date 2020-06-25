import {Injectable, Injector} from '@angular/core';
import { FetchClient } from '@c8y/ngx-components/api';
import { IFetchOptions } from '@c8y/client';

@Injectable({providedIn: 'root'})
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

  async getJobState(jobId) {
    const response = await this.fetchClient.fetch(this.dataHubDremioApi + '/job/' + jobId, this.fetchOptions);
    if (response.status >= 200 && response.status < 300) {
      return response.json();
    } else {
      throw new Error(await response.text());
    }
  }

  async getJobResults(jobId) {
    const response = await this.fetchClient.fetch(this.dataHubDremioApi + '/job/' + jobId + '/results', this.fetchOptions)
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
}
