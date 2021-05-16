import { fakeRequest } from '../utils';

import {
  TDeployments,
  TEnvironments,
  TProjects,
  TReleases,
  ArrayElement,
} from '../types';
import { IReleaseRetentionProps, TRetainedReleases } from './types';

export const DATA_LIFETIME_MS = 5 * 1000; // 5 sec
const DEFAULT_AMOUNT_OF_RELEASES = 3;

class ReleaseRetention {
  protected amountOfReleases: number;
  protected deployments: TDeployments = [];
  protected environments: TEnvironments = [];
  protected projects: TProjects = [];
  protected releases: TReleases = [];
  protected _retainedReleases: TRetainedReleases = {};
  updateAt?: Date;
  private shouldPrepareData = true;

  constructor({
    amountOfReleases = DEFAULT_AMOUNT_OF_RELEASES,
  }: IReleaseRetentionProps) {
    this.amountOfReleases = amountOfReleases;
  }

  init() {
    return this.loadData();
  }

  refresh() {
    this.shouldPrepareData = true;
    return this.loadData();
  }

  get retainedReleases(): TRetainedReleases {
    if (!this.updateAt) {
      throw new Error('Load all the required data first, use init()');
    }

    // can be deleted
    if (new Date().getTime() - this.updateAt.getTime() > DATA_LIFETIME_MS) {
      console.info(
        'The data is outdated, recommended to update, use refresh()'
      );
    }

    if (this.shouldPrepareData) {
      this.prepareRetantionData();
      this.shouldPrepareData = false;
    }

    return this._retainedReleases;
  }

  // ****************

  protected async loadData() {
    try {
      await Promise.all([
        this.getProjects(),
        this.getEnvironments(),
        this.getReleases(),
        this.getDeployments(),
      ]);

      this.updateAt = new Date();
      return;
    } catch (error) {
      return error;
    }
  }

  private prepareRetantionData() {
    const sortedDeploymentsByDeployedAt = this.deployments.sort(
      this.descSortByDeployedAt
    );

    this.environments.forEach((environment) => {
      const { Id: envId, Name: envName } = environment;

      // Hint! Add projectId to Deploy model to decrease the complexity of find operation
      const deploymentsByEnv = this.filterDeploymentsByEnv(
        sortedDeploymentsByDeployedAt,
        envId
      );

      this.projects.forEach((project) => {
        const { Id: projectId, Name: projectName } = project;

        const filtredReleases = [];

        for (let deploy of deploymentsByEnv) {
          if (filtredReleases.length < this.amountOfReleases) {
            // Hint! Rewrite Release model and make database index by ProjectId/EnvironmentId for O(1) read operations
            // Hint! Remove all invalid data (nonexistent project, null version)
            // Hint! Add server-side filters/sorting/paging
            const release = this.getReleaseBy(projectId, deploy.ReleaseId);
            if (release) filtredReleases.push(release.Version);
          } else {
            break;
          }
        }

        this._retainedReleases = Object.assign({}, this._retainedReleases, {
          [projectName]: Object.assign(
            {},
            this._retainedReleases[projectName],
            {
              [envName]: filtredReleases,
            }
          ),
        });
      });
    });
  }

  private descSortByDeployedAt(
    a: ArrayElement<TDeployments>,
    b: ArrayElement<TDeployments>
  ) {
    return new Date(b.DeployedAt).valueOf() - new Date(a.DeployedAt).valueOf();
  }

  private filterDeploymentsByEnv(
    deployments: TDeployments,
    envId: ArrayElement<TEnvironments>['Id']
  ) {
    return deployments.filter(
      ({ EnvironmentId: deployEnvId }) => deployEnvId === envId
    );
  }

  private getReleaseBy(
    projectId: ArrayElement<TProjects>['Id'],
    deployReleaseId: ArrayElement<TDeployments>['ReleaseId']
  ) {
    return this.releases.find(
      ({ Id: releaseId, ProjectId: releaseProjectId }) =>
        releaseId === deployReleaseId && releaseProjectId === projectId
    );
  }

  protected async getProjects() {
    try {
      const projects = await fakeRequest<TProjects>('Projects');
      this.projects = projects;
    } catch {
      throw Error('Projects are not available');
    }
  }

  protected async getEnvironments() {
    try {
      const environments = await fakeRequest<TEnvironments>('Environments');
      this.environments = environments;
    } catch {
      throw Error('Environments are not available');
    }
  }

  protected async getReleases() {
    try {
      const releases = await fakeRequest<TReleases>('Releases');
      this.releases = releases;
    } catch {
      throw Error('Releases are not available');
    }
  }

  protected async getDeployments() {
    try {
      const deployments = await fakeRequest<TDeployments>('Deployments');
      this.deployments = deployments;
    } catch {
      throw Error('Deployments are not available');
    }
  }

  // Сan be extended through filters (project, env)
  log() {
    for (let project of this.projects) {
      const { Name: projectName } = project;

      for (let environment of this.environments) {
        const { Name: envName } = environment;

        const versions = this._retainedReleases[projectName][envName];

        console.log(
          `For Project: "${projectName}" and ENV: "${envName}" the last ${
            this.amountOfReleases
          } releases: ${
            versions && versions.length ? versions.join(', ') : 'empty'
          }`
        );
      }
    }

    console.log(
      `If the number of releases less than ${this.amountOfReleases}, then not for all project/env combinations were found needed count of deployments or valid releases`
    );
  }
}

export default ReleaseRetention;
