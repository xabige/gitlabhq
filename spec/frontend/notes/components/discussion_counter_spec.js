import Vuex from 'vuex';
import { shallowMount, createLocalVue } from '@vue/test-utils';
import { GlIcon } from '@gitlab/ui';
import notesModule from '~/notes/stores/modules';
import DiscussionCounter from '~/notes/components/discussion_counter.vue';
import { noteableDataMock, discussionMock, notesDataMock, userDataMock } from '../mock_data';
import * as types from '~/notes/stores/mutation_types';

describe('DiscussionCounter component', () => {
  let store;
  let wrapper;
  const localVue = createLocalVue();

  localVue.use(Vuex);

  beforeEach(() => {
    window.mrTabs = {};
    const { state, getters, mutations, actions } = notesModule();

    store = new Vuex.Store({
      state: {
        ...state,
        userData: userDataMock,
      },
      getters,
      mutations,
      actions,
    });
    store.dispatch('setNoteableData', {
      ...noteableDataMock,
      create_issue_to_resolve_discussions_path: '/test',
    });
    store.dispatch('setNotesData', notesDataMock);
  });

  afterEach(() => {
    wrapper.vm.$destroy();
    wrapper = null;
  });

  describe('has no discussions', () => {
    it('does not render', () => {
      wrapper = shallowMount(DiscussionCounter, { store, localVue });

      expect(wrapper.find({ ref: 'discussionCounter' }).exists()).toBe(false);
    });
  });

  describe('has no resolvable discussions', () => {
    it('does not render', () => {
      store.commit(types.SET_INITIAL_DISCUSSIONS, [{ ...discussionMock, resolvable: false }]);
      store.dispatch('updateResolvableDiscussionsCounts');
      wrapper = shallowMount(DiscussionCounter, { store, localVue });

      expect(wrapper.find({ ref: 'discussionCounter' }).exists()).toBe(false);
    });
  });

  describe('has resolvable discussions', () => {
    const updateStore = (note = {}) => {
      discussionMock.notes[0] = { ...discussionMock.notes[0], ...note };
      store.commit(types.SET_INITIAL_DISCUSSIONS, [discussionMock]);
      store.dispatch('updateResolvableDiscussionsCounts');
    };

    afterEach(() => {
      delete discussionMock.notes[0].resolvable;
      delete discussionMock.notes[0].resolved;
    });

    it('renders', () => {
      updateStore();
      wrapper = shallowMount(DiscussionCounter, { store, localVue });

      expect(wrapper.find({ ref: 'discussionCounter' }).exists()).toBe(true);
    });

    it.each`
      title                | resolved | isActive | groupLength
      ${'not allResolved'} | ${false} | ${false} | ${3}
      ${'allResolved'}     | ${true}  | ${true}  | ${1}
    `('renders correctly if $title', ({ resolved, isActive, groupLength }) => {
      updateStore({ resolvable: true, resolved });
      wrapper = shallowMount(DiscussionCounter, { store, localVue });

      expect(wrapper.find(`.is-active`).exists()).toBe(isActive);
      expect(wrapper.findAll('[role="group"').length).toBe(groupLength);
    });
  });

  describe('toggle all threads button', () => {
    let toggleAllButton;
    const updateStoreWithExpanded = expanded => {
      const discussion = { ...discussionMock, expanded };
      store.commit(types.SET_INITIAL_DISCUSSIONS, [discussion]);
      store.dispatch('updateResolvableDiscussionsCounts');
      wrapper = shallowMount(DiscussionCounter, { store, localVue });
      toggleAllButton = wrapper.find('.toggle-all-discussions-btn');
    };

    afterEach(() => wrapper.destroy());

    it('calls button handler when clicked', () => {
      updateStoreWithExpanded(true);

      wrapper.setMethods({ handleExpandDiscussions: jest.fn() });
      toggleAllButton.trigger('click');

      expect(wrapper.vm.handleExpandDiscussions).toHaveBeenCalledTimes(1);
    });

    it('collapses all discussions if expanded', () => {
      updateStoreWithExpanded(true);

      expect(wrapper.vm.allExpanded).toBe(true);
      expect(toggleAllButton.find(GlIcon).props().name).toBe('angle-up');

      toggleAllButton.trigger('click');

      return wrapper.vm.$nextTick().then(() => {
        expect(wrapper.vm.allExpanded).toBe(false);
        expect(toggleAllButton.find(GlIcon).props().name).toBe('angle-down');
      });
    });

    it('expands all discussions if collapsed', () => {
      updateStoreWithExpanded(false);

      expect(wrapper.vm.allExpanded).toBe(false);
      expect(toggleAllButton.find(GlIcon).props().name).toBe('angle-down');

      toggleAllButton.trigger('click');

      return wrapper.vm.$nextTick().then(() => {
        expect(wrapper.vm.allExpanded).toBe(true);
        expect(toggleAllButton.find(GlIcon).props().name).toBe('angle-up');
      });
    });
  });
});
