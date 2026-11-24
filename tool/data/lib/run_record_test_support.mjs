/** A Firestore stand-in with set and update by path, as the helper uses. */
export function runRecordDb() {
  const data = {};
  return {
    data,
    collection: (name) => ({
      doc: (id) => {
        const key = `${name}/${id}`;
        return {
          set: async (value) => {
            data[key] = structuredClone(value);
          },
          update: async (value) => {
            if (!data[key]) throw new Error(`NOT_FOUND ${key}`);
            data[key] = {...data[key], ...structuredClone(value)};
          },
        };
      },
    }),
  };
}
