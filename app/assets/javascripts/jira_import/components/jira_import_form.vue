<script>
import {
  GlAlert,
  GlButton,
  GlNewDropdown,
  GlNewDropdownItem,
  GlNewDropdownText,
  GlFormGroup,
  GlFormSelect,
  GlIcon,
  GlLabel,
  GlLoadingIcon,
  GlSearchBoxByType,
  GlSprintf,
  GlTable,
} from '@gitlab/ui';
import { debounce } from 'lodash';
import axios from '~/lib/utils/axios_utils';
import { __ } from '~/locale';
import getJiraUserMappingMutation from '../queries/get_jira_user_mapping.mutation.graphql';
import initiateJiraImportMutation from '../queries/initiate_jira_import.mutation.graphql';
import { addInProgressImportToStore } from '../utils/cache_update';
import {
  debounceWait,
  dropdownLabel,
  userMappingsPageSize,
  previousImportsMessage,
  tableConfig,
  userMappingMessage,
} from '../utils/constants';

export default {
  name: 'JiraImportForm',
  components: {
    GlAlert,
    GlButton,
    GlNewDropdown,
    GlNewDropdownItem,
    GlNewDropdownText,
    GlFormGroup,
    GlFormSelect,
    GlIcon,
    GlLabel,
    GlLoadingIcon,
    GlSearchBoxByType,
    GlSprintf,
    GlTable,
  },
  currentUsername: gon.current_username,
  dropdownLabel,
  previousImportsMessage,
  tableConfig,
  userMappingMessage,
  props: {
    issuesPath: {
      type: String,
      required: true,
    },
    jiraImports: {
      type: Array,
      required: true,
    },
    jiraProjects: {
      type: Array,
      required: true,
    },
    projectId: {
      type: String,
      required: true,
    },
    projectPath: {
      type: String,
      required: true,
    },
  },
  data() {
    return {
      hasMoreUsers: false,
      isFetching: false,
      isLoadingMoreUsers: false,
      isSubmitting: false,
      searchTerm: '',
      selectedProject: undefined,
      selectState: null,
      userMappings: [],
      userMappingsStartAt: 0,
      users: [],
    };
  },
  computed: {
    shouldShowNoMatchesFoundText() {
      return !this.isFetching && this.users.length === 0;
    },
    numberOfPreviousImports() {
      return this.jiraImports?.reduce?.(
        (acc, jiraProject) => (jiraProject.jiraProjectKey === this.selectedProject ? acc + 1 : acc),
        0,
      );
    },
    hasPreviousImports() {
      return this.numberOfPreviousImports > 0;
    },
    importLabel() {
      return this.selectedProject
        ? `jira-import::${this.selectedProject}-${this.numberOfPreviousImports + 1}`
        : 'jira-import::KEY-1';
    },
    isInitialLoadingState() {
      return this.isLoadingMoreUsers && !this.hasMoreUsers;
    },
  },
  watch: {
    searchTerm: debounce(function debouncedUserSearch() {
      this.searchUsers();
    }, debounceWait),
  },
  mounted() {
    this.getJiraUserMapping();

    this.searchUsers()
      .then(data => {
        this.initialUsers = data;
      })
      .catch(() => {});
  },
  methods: {
    getJiraUserMapping() {
      this.isLoadingMoreUsers = true;

      this.$apollo
        .mutate({
          mutation: getJiraUserMappingMutation,
          variables: {
            input: {
              projectPath: this.projectPath,
              startAt: this.userMappingsStartAt,
            },
          },
        })
        .then(({ data }) => {
          if (data.jiraImportUsers.errors.length) {
            this.$emit('error', data.jiraImportUsers.errors.join('. '));
            return;
          }

          this.userMappings = this.userMappings.concat(data.jiraImportUsers.jiraUsers);
          this.hasMoreUsers = data.jiraImportUsers.jiraUsers.length === userMappingsPageSize;
          this.userMappingsStartAt += userMappingsPageSize;
        })
        .catch(() => {
          this.$emit('error', __('There was an error retrieving the Jira users.'));
        })
        .finally(() => {
          this.isLoadingMoreUsers = false;
        });
    },
    searchUsers() {
      const params = {
        active: true,
        project_id: this.projectId,
        search: this.searchTerm,
      };

      this.isFetching = true;

      return axios
        .get('/-/autocomplete/users.json', { params })
        .then(({ data }) => {
          this.users = data;
          return data;
        })
        .finally(() => {
          this.isFetching = false;
        });
    },
    resetDropdown() {
      this.searchTerm = '';
      this.users = this.initialUsers;
    },
    initiateJiraImport(event) {
      event.preventDefault();

      if (this.selectedProject) {
        this.hideValidationError();

        this.isSubmitting = true;

        this.$apollo
          .mutate({
            mutation: initiateJiraImportMutation,
            variables: {
              input: {
                jiraProjectKey: this.selectedProject,
                projectPath: this.projectPath,
                usersMapping: this.userMappings.map(({ gitlabId, jiraAccountId }) => ({
                  gitlabId,
                  jiraAccountId,
                })),
              },
            },
            update: (store, { data }) =>
              addInProgressImportToStore(store, data.jiraImportStart, this.projectPath),
          })
          .then(({ data }) => {
            if (data.jiraImportStart.errors.length) {
              this.$emit('error', data.jiraImportStart.errors.join('. '));
            } else {
              this.selectedProject = undefined;
            }
          })
          .catch(() => {
            this.$emit('error', __('There was an error importing the Jira project.'));
          })
          .finally(() => {
            this.isSubmitting = false;
          });
      } else {
        this.showValidationError();
      }
    },
    updateMapping(jiraAccountId, gitlabId, gitlabUsername) {
      this.userMappings = this.userMappings.map(userMapping =>
        userMapping.jiraAccountId === jiraAccountId
          ? {
              ...userMapping,
              gitlabId,
              gitlabUsername,
            }
          : userMapping,
      );
    },
    hideValidationError() {
      this.selectState = null;
    },
    showValidationError() {
      this.selectState = false;
    },
  },
};
</script>

<template>
  <div>
    <gl-alert v-if="hasPreviousImports" variant="warning" :dismissible="false">
      <gl-sprintf :message="$options.previousImportsMessage">
        <template #numberOfPreviousImports>{{ numberOfPreviousImports }}</template>
      </gl-sprintf>
    </gl-alert>

    <h3 class="page-title">{{ __('New Jira import') }}</h3>

    <hr />

    <form @submit="initiateJiraImport">
      <gl-form-group
        class="row align-items-center"
        :invalid-feedback="__('Please select a Jira project')"
        :label="__('Import from')"
        label-cols-sm="2"
        label-for="jira-project-select"
      >
        <gl-form-select
          id="jira-project-select"
          v-model="selectedProject"
          data-qa-selector="jira_project_dropdown"
          class="mb-2"
          :options="jiraProjects"
          :state="selectState"
        />
      </gl-form-group>

      <gl-form-group
        class="row gl-align-items-center gl-mb-6"
        :label="__('Issue label')"
        label-cols-sm="2"
        label-for="jira-project-label"
      >
        <gl-label
          id="jira-project-label"
          class="mb-2"
          background-color="#428BCA"
          :title="importLabel"
          scoped
        />
      </gl-form-group>

      <h4 class="gl-mb-4">{{ __('Jira-GitLab user mapping template') }}</h4>

      <p>{{ $options.userMappingMessage }}</p>

      <gl-table :fields="$options.tableConfig" :items="userMappings" fixed>
        <template #cell(arrow)>
          <gl-icon name="arrow-right" :aria-label="__('Will be mapped to')" />
        </template>
        <template #cell(gitlabUsername)="data">
          <gl-new-dropdown
            :text="data.value || $options.currentUsername"
            class="w-100"
            :aria-label="
              sprintf($options.dropdownLabel, { jiraDisplayName: data.item.jiraDisplayName })
            "
            @hide="resetDropdown"
          >
            <gl-search-box-by-type v-model.trim="searchTerm" class="gl-m-3" />

            <gl-loading-icon v-if="isFetching" />

            <gl-new-dropdown-item
              v-for="user in users"
              v-else
              :key="user.id"
              @click="updateMapping(data.item.jiraAccountId, user.id, user.username)"
            >
              {{ user.username }} ({{ user.name }})
            </gl-new-dropdown-item>

            <gl-new-dropdown-text v-show="shouldShowNoMatchesFoundText" class="text-secondary">
              {{ __('No matches found') }}
            </gl-new-dropdown-text>
          </gl-new-dropdown>
        </template>
      </gl-table>

      <gl-loading-icon v-if="isInitialLoadingState" />

      <gl-button
        v-if="hasMoreUsers"
        :loading="isLoadingMoreUsers"
        data-testid="load-more-users-button"
        @click="getJiraUserMapping"
      >
        {{ __('Load more users') }}
      </gl-button>

      <div class="footer-block row-content-block d-flex justify-content-between">
        <gl-button
          type="submit"
          category="primary"
          variant="success"
          class="js-no-auto-disable"
          :loading="isSubmitting"
          data-qa-selector="jira_issues_import_button"
        >
          {{ __('Continue') }}
        </gl-button>
        <gl-button :href="issuesPath">{{ __('Cancel') }}</gl-button>
      </div>
    </form>
  </div>
</template>
