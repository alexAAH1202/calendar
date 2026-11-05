import { beforeEach, describe, expect, it } from 'vitest';
import { createLocalStore } from './localStore';
import type { Person } from './types';

beforeEach(() => window.localStorage.clear());

describe('localStore people', () => {
  it('starts with the example child, and quick partial edits never undo each other', async () => {
    const store = createLocalStore();
    let people: Person[] = [];
    store.subscribePeople((p) => (people = p));
    expect(people.map((p) => p.name)).toEqual(['Ava']);
    await store.updatePerson('p_child', { name: 'Mia' });
    await store.updatePerson('p_child', { sensory: { textSize: 'large' } });
    await store.updatePerson('p_child', { sensory: { completedBehaviour: 'hide' } });
    expect(people[0]).toMatchObject({ name: 'Mia', sensory: { textSize: 'large', completedBehaviour: 'hide' } });
  });
});
