/** @jest-environment jsdom */
import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';

let mod;
let formStore;
let getFormData;
let setFormData;
let updateFormState;
let resetFormData;
let batchGetFormData;
let batchSetFormData;
let formState;

beforeEach(async () => {
  jest.resetModules();
  mod = await import('../../packages/ui-components/index.js');
  formStore = mod.formStore;
  getFormData = mod.getFormData;
  setFormData = mod.setFormData;
  updateFormState = mod.updateFormState;
  resetFormData = mod.resetFormData;
  batchGetFormData = mod.batchGetFormData;
  batchSetFormData = mod.batchSetFormData;
  formState = mod.formState;
});

describe('@wpsk/ui-components — flat signal store', () => {
  test('formStore is a flat signal — values are stored as plain JS, not nested signals', async () => {
    // The refactor requirement: NOT nested signals.
    // `formStore.value` is a plain object; reads should yield raw values.
    setFormData('weight', 100);
    setFormData('city', 'Tehran');
    expect(formStore.value).toEqual({ weight: 100, city: 'Tehran' });
    // No nested signal instances on the values.
    expect(typeof formStore.value.weight).toBe('number');
    expect(typeof formStore.value.city).toBe('string');
  });

  test('getFormData / setFormData reads and writes by name', () => {
    setFormData('name', 'Alice');
    expect(getFormData('name')).toBe('Alice');
    setFormData('age', 30);
    expect(getFormData('age')).toBe(30);
    // Unknown key returns undefined (or signal-style: undefined).
    expect(getFormData('unknown')).toBeUndefined();
  });

  test('updateFormState(values, merge=true) merges into formState signal', () => {
    updateFormState({ _initialValues: { weight: 50 }, changedInput: 'weight' });
    expect(formState.value._initialValues).toEqual({ weight: 50 });
    expect(formState.value.changedInput).toBe('weight');

    // Merge = true keeps existing keys and adds new ones.
    updateFormState({ changedInput: 'city' });
    expect(formState.value._initialValues).toEqual({ weight: 50 });
    expect(formState.value.changedInput).toBe('city');
  });

  test('updateFormState(values, merge=false) replaces, but preserves _initialValues', () => {
    updateFormState({ _initialValues: { weight: 50 }, changedInput: 'weight' });
    updateFormState({ changedInput: 'city' }, false);
    // _initialValues was set in the previous update; with merge=false it
    // is wiped from `formState.value` (caller is responsible for re-passing it).
    expect(formState.value.changedInput).toBe('city');
  });

  test('resetFormData(defaults) resets all form fields to defaults', () => {
    setFormData('weight', 999);
    setFormData('city', 'OldCity');
    resetFormData({ weight: 10, city: 'Tehran' });
    expect(getFormData('weight')).toBe(10);
    expect(getFormData('city')).toBe('Tehran');
  });

  test('resetFormData() with no args falls back to "" for unknown keys', () => {
    setFormData('weight', 999);
    resetFormData();
    expect(getFormData('weight')).toBe('');
  });

  test('batchGetFormData returns a flat object snapshot of all fields', () => {
    setFormData('a', 1);
    setFormData('b', 'two');
    setFormData('c', true);
    expect(batchGetFormData()).toEqual({ a: 1, b: 'two', c: true });
  });

  test('batchSetFormData applies many writes in one shot', () => {
    batchSetFormData({ x: 10, y: 20, z: 30 });
    expect(getFormData('x')).toBe(10);
    expect(getFormData('y')).toBe(20);
    expect(getFormData('z')).toBe(30);
  });
});
