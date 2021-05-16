export function fakeRequest<T extends unknown>(path: string): Promise<T> {
  return import(`${process.cwd()}/src/api/${path}.json`);
}
