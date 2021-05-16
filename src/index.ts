import ReleaseRetention from './ReleaseRetention';

console.log(`.\n.\n.\n`);

const ReleaseRetentionOverviewPage = new ReleaseRetention({
  amountOfReleases: 5,
});

// Example of workflow
(async () => {
  try {
    console.log(ReleaseRetentionOverviewPage.retainedReleases);
  } catch (error) {
    console.log(error);
  }
  console.log('----------');

  await ReleaseRetentionOverviewPage.init();
  console.log(
    'Retained Releases:',
    ReleaseRetentionOverviewPage.retainedReleases
  );
  console.log('----------');

  ReleaseRetentionOverviewPage.log();
  console.log('----------');

  console.log('Start timer: 6 sec');
  await new Promise((resolve) => setTimeout(() => resolve(''), 6000));
  console.log(ReleaseRetentionOverviewPage.retainedReleases);
  await ReleaseRetentionOverviewPage.refresh();
  console.log(ReleaseRetentionOverviewPage.retainedReleases);
  console.log('----------');
})();

setInterval(() => {}, 1 << 30);
