<script>
import { mapState, mapActions } from 'vuex';
import { GlSprintf } from '@gitlab/ui';
import { deprecatedCreateFlash as createFlash } from '~/flash';
import { s__ } from '~/locale';
import DeprecatedModal2 from '~/vue_shared/components/deprecated_modal_2.vue';
import Badge from './badge.vue';
import BadgeForm from './badge_form.vue';
import BadgeList from './badge_list.vue';

export default {
  name: 'BadgeSettings',
  components: {
    Badge,
    BadgeForm,
    BadgeList,
    GlModal: DeprecatedModal2,
    GlSprintf,
  },
  i18n: {
    deleteModalText: s__(
      'Badges|You are going to delete this badge. Deleted badges %{strongStart}cannot%{strongEnd} be restored.',
    ),
  },
  computed: {
    ...mapState(['badgeInModal', 'isEditing']),
  },
  methods: {
    ...mapActions(['deleteBadge']),
    onSubmitModal() {
      this.deleteBadge(this.badgeInModal)
        .then(() => {
          createFlash(s__('Badges|The badge was deleted.'), 'notice');
        })
        .catch(error => {
          createFlash(s__('Badges|Deleting the badge failed, please try again.'));
          throw error;
        });
    },
  },
};
</script>

<template>
  <div class="badge-settings">
    <gl-modal
      id="delete-badge-modal"
      :header-title-text="s__('Badges|Delete badge?')"
      :footer-primary-button-text="s__('Badges|Delete badge')"
      footer-primary-button-variant="danger"
      @submit="onSubmitModal"
    >
      <div class="well">
        <badge
          :image-url="badgeInModal ? badgeInModal.renderedImageUrl : ''"
          :link-url="badgeInModal ? badgeInModal.renderedLinkUrl : ''"
        />
      </div>
      <p>
        <gl-sprintf :message="$options.i18n.deleteModalText">
          <template #strong="{ content }">
            <strong>{{ content }}</strong>
          </template>
        </gl-sprintf>
      </p>
    </gl-modal>

    <badge-form v-show="isEditing" :is-editing="true" />

    <badge-form v-show="!isEditing" :is-editing="false" />
    <badge-list v-show="!isEditing" />
  </div>
</template>
