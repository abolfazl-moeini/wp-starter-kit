/**
 * Dynamic repeating rows helper for WDForm stores.
 */

/**
 * @param {import('./createWDFormStore.js').WDFormStoreApi} store
 * @param {string} name
 */
export function createFieldArray(store, name) {
  function readRows() {
    const rows = store.fields.value[name];
    return Array.isArray(rows) ? rows : [];
  }

  function writeRows(rows) {
    store.setValue(name, rows);
  }

  return {
    name,
    get fields() {
      return readRows();
    },
    register(index, fieldName) {
      const rows = readRows();
      const row = rows[index] ?? {};
      const value = row[fieldName] ?? "";
      const readOnly = store.mode && store.mode.value === "view";
      return {
        name: `${name}[${index}].${fieldName}`,
        value,
        readOnly: readOnly || undefined,
        tabIndex: readOnly ? -1 : undefined,
        onChange: (event) => {
          if (readOnly) return;
          const nextValue =
            event && event.target !== undefined ? event.target.value : event;
          const nextRows = [...readRows()];
          const nextRow = {
            ...(nextRows[index] ?? {}),
            [fieldName]: nextValue,
          };
          nextRows[index] = nextRow;
          writeRows(nextRows);
        },
        onBlur: () => {
          if (readOnly) return;
          store.validateFields([`${name}[${index}].${fieldName}`]);
        },
      };
    },
    append(defaultRow = {}) {
      writeRows([...readRows(), defaultRow]);
    },
    remove(index) {
      const nextRows = readRows().filter((_, i) => i !== index);
      writeRows(nextRows);
    },
    move(from, to) {
      const rows = [...readRows()];
      if (from < 0 || to < 0 || from >= rows.length || to >= rows.length) {
        return;
      }
      const [item] = rows.splice(from, 1);
      rows.splice(to, 0, item);
      writeRows(rows);
    },
    swap(a, b) {
      const rows = [...readRows()];
      if (a < 0 || b < 0 || a >= rows.length || b >= rows.length) {
        return;
      }
      [rows[a], rows[b]] = [rows[b], rows[a]];
      writeRows(rows);
    },
  };
}
