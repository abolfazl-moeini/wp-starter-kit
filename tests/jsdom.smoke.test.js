/** @jest-environment jsdom */
// Preact mount smoke tests — Phase 5.3
// Verifies:
//   1. mountComponent() renders a component into a div by id (Preact render is called)
//   2. elementProps() converts data-* attributes to camelCase props (data-foo → foo)
//   3. mountComponent() merges extraProps and forwards them to the rendered component
//   4. mountComponent() is a no-op when the target element does not exist
//
// Constraint: NO hardcoded WPSK brand string in the tests. Placeholder id is generic.

import { test, expect, beforeEach, afterEach } from '@jest/globals';
import { h } from 'preact';
// Import the package under test. Falls through the alias `npm:@preact/compat`
// only if some downstream package tries to `import 'react'` — we never do that here.
import { elementProps, mountComponent } from '../packages/html-utils/index.js';

beforeEach(() => {
  // Reset DOM between tests — each test owns its placeholder.
  document.body.innerHTML = '';
});

afterEach(() => {
  document.body.innerHTML = '';
});

test('mountComponent renders a Preact component into the target div', () => {
  // Arrange — a generic placeholder, NOT a brand-specific id.
  const placeholder = document.createElement('div');
  placeholder.id = 'counter-mount';
  document.body.appendChild(placeholder);

  function Hello(props) {
    return h('p', { 'data-greeting': 'hi' }, `hello ${props.name}`);
  }

  // Act
  mountComponent('counter-mount', Hello, { name: 'world' });

  // Assert
  const rendered = document.getElementById('counter-mount');
  expect(rendered).not.toBeNull();
  expect(rendered.querySelector('p').getAttribute('data-greeting')).toBe('hi');
  expect(rendered.textContent).toBe('hello world');
});

test('elementProps converts data-foo="bar" into a foo: "bar" prop', () => {
  // Arrange
  const el = document.createElement('div');
  el.setAttribute('data-foo', 'bar');
  document.body.appendChild(el);

  // Act
  const props = elementProps(el);

  // Assert — camelCased prop name, original string value
  expect(props).toEqual({ foo: 'bar' });
});

test('elementProps parses JSON values for booleans and numbers', () => {
  // Arrange
  const el = document.createElement('div');
  el.setAttribute('data-enabled', 'true');
  el.setAttribute('data-count', '42');
  el.setAttribute('data-label', 'plain string');
  document.body.appendChild(el);

  // Act
  const props = elementProps(el);

  // Assert
  expect(props.enabled).toBe(true);
  expect(props.count).toBe(42);
  // JSON.parse('plain string') throws → fall back to raw string
  expect(props.label).toBe('plain string');
});

test('mountComponent merges extraProps with elementProps (data-* attributes flow through)', () => {
  // Arrange — placeholder has a data-* attribute, the caller also supplies extraProps.
  // Both must end up on the rendered component.
  const placeholder = document.createElement('div');
  placeholder.id = 'merged-props';
  placeholder.setAttribute('data-foo', 'bar');
  document.body.appendChild(placeholder);

  function Inspect(props) {
    return h(
      'pre',
      { 'data-foo': String(props.foo), 'data-start': String(props.start) },
      JSON.stringify(props)
    );
  }

  // Act
  mountComponent('merged-props', Inspect, { start: 5 });

  // Assert — extraProps (start) and elementProps (foo) both reach the component
  const rendered = document.getElementById('merged-props');
  expect(rendered.querySelector('pre').getAttribute('data-foo')).toBe('bar');
  expect(rendered.querySelector('pre').getAttribute('data-start')).toBe('5');
  // Rendered JSON shows both fields are present
  const dump = JSON.parse(rendered.querySelector('pre').textContent);
  expect(dump).toEqual({ foo: 'bar', start: 5 });
});

test('mountComponent is a no-op when the target element does not exist', () => {
  // Arrange — no element with id 'does-not-exist' is added to the DOM
  function Noop() {
    return h('span', null, 'should not render');
  }

  // Act + Assert — must not throw
  expect(() => mountComponent('does-not-exist', Noop, {})).not.toThrow();

  // The non-existent element stays non-existent — nothing is appended to body
  expect(document.getElementById('does-not-exist')).toBeNull();
  expect(document.body.children.length).toBe(0);
});
