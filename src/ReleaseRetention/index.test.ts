import ReleaseRetention from './index';

const amountOfReleases = 2;

const initialData = {
  deployments: [],
  environments: [],
  projects: [],
  releases: [],
  _retainedReleases: {},
  shouldPrepareData: true,
  amountOfReleases: amountOfReleases,
};

describe('Release Retention: Class methods', () => {
  it('constructor', () => {
    const instance = new ReleaseRetention({ amountOfReleases });
    expect(JSON.stringify(instance)).toBe(JSON.stringify(initialData));
  });

  it('init/refresh calls chain', async () => {
    const instance = new ReleaseRetention({ amountOfReleases });
    const mockLoadData = jest.fn();
    instance['loadData'] = mockLoadData;

    await instance.init();
    await instance.refresh();

    expect(mockLoadData.mock.calls.length).toEqual(2);
  });

  it('get value before init()', () => {
    const instance = new ReleaseRetention({ amountOfReleases });
    expect(() => instance.retainedReleases).toThrowError();
  });

  it('load required data', async () => {
    const instance = new ReleaseRetention({ amountOfReleases });

    await instance.init();

    expect(instance.updateAt).not.toBeUndefined();

    expect(instance['projects']).toBe(await import('../api/Projects.json'));
    expect(instance['environments']).toBe(
      await import('../api/Environments.json')
    );
    expect(instance['releases']).toBe(await import('../api/Releases.json'));
    expect(instance['deployments']).toBe(
      await import('../api/Deployments.json')
    );
  });

  it('error of data loading', async () => {
    const instance = new ReleaseRetention({ amountOfReleases });

    const error = new Error('Test Error');
    instance['getProjects'] = () => {
      throw error;
    };

    const res = await instance.init();

    expect(res).toBe(error);
  });

  it('caching results', async () => {
    const instance = new ReleaseRetention({ amountOfReleases });

    await instance.init();

    const obj = instance.retainedReleases;
    const nextObj = instance.retainedReleases;

    expect(obj === nextObj).toBeTruthy();
  });

  it('updating the data creates a new object', async () => {
    const instance = new ReleaseRetention({ amountOfReleases });

    await instance.init();
    const obj = instance.retainedReleases;

    await instance.refresh();
    const nextObj = instance.retainedReleases;

    expect(obj === nextObj).toBeFalsy();
    expect(JSON.stringify(obj)).toBe(JSON.stringify(nextObj));
  });
});

// Based on mocked api
describe('Release Retention: Work with data', () => {
  it('amountOfReleases: 2', async () => {
    const instance = new ReleaseRetention({ amountOfReleases });
    await instance.init();

    const project = await import('../api/Projects.json');
    const environment = await import('../api/Environments.json');
    const firstProjectName = project[0].Name;
    const secondProjectName = project[1].Name;
    const stagingEnv = environment[0].Name;
    const productionEnv = environment[1].Name;

    expect(
      JSON.stringify(instance.retainedReleases[firstProjectName][stagingEnv])
    ).toBe(JSON.stringify(['1.0.1', '1.0.0']));
    expect(
      JSON.stringify(instance.retainedReleases[firstProjectName][productionEnv])
    ).toBe(JSON.stringify(['1.0.0']));
    expect(
      JSON.stringify(instance.retainedReleases[secondProjectName][stagingEnv])
    ).toBe(JSON.stringify(['1.0.2', '1.0.3']));
    expect(
      JSON.stringify(
        instance.retainedReleases[secondProjectName][productionEnv]
      )
    ).toBe(JSON.stringify(['1.0.2']));
  });

  it('amountOfReleases: 5', async () => {
    const instance = new ReleaseRetention({ amountOfReleases: 5 });
    await instance.init();

    const project = await import('../api/Projects.json');
    const environment = await import('../api/Environments.json');
    const firstProjectName = project[0].Name;
    const secondProjectName = project[1].Name;
    const stagingEnv = environment[0].Name;
    const productionEnv = environment[1].Name;

    expect(
      JSON.stringify(instance.retainedReleases[firstProjectName][stagingEnv])
    ).toBe(JSON.stringify(['1.0.1', '1.0.0']));
    expect(
      JSON.stringify(instance.retainedReleases[firstProjectName][productionEnv])
    ).toBe(JSON.stringify(['1.0.0']));
    expect(
      JSON.stringify(instance.retainedReleases[secondProjectName][stagingEnv])
    ).toBe(JSON.stringify(['1.0.2', '1.0.3', '1.0.2', '1.0.1-ci1']));
    expect(
      JSON.stringify(
        instance.retainedReleases[secondProjectName][productionEnv]
      )
    ).toBe(JSON.stringify(['1.0.2']));
  });
});
