<script>
import { uniqBy } from 'lodash';
import { GlIcon } from '@gitlab/ui';
import UserAvatarLink from '~/vue_shared/components/user_avatar/user_avatar_link.vue';
import TimeAgoTooltip from '~/vue_shared/components/time_ago_tooltip.vue';

export default {
  components: {
    GlIcon,
    UserAvatarLink,
    TimeAgoTooltip,
  },
  props: {
    collapsed: {
      type: Boolean,
      required: true,
    },
    replies: {
      type: Array,
      required: true,
    },
  },
  computed: {
    lastReply() {
      return this.replies[this.replies.length - 1];
    },
    uniqueAuthors() {
      const authors = this.replies.map(reply => reply.author || {});

      return uniqBy(authors, author => author.username);
    },
    className() {
      return this.collapsed ? 'collapsed' : 'expanded';
    },
  },
  methods: {
    toggle() {
      this.$emit('toggle');
    },
  },
};
</script>

<template>
  <li :class="className" class="replies-toggle js-toggle-replies">
    <template v-if="collapsed">
      <gl-icon name="chevron-right" @click.native="toggle" />
      <div>
        <user-avatar-link
          v-for="author in uniqueAuthors"
          :key="author.username"
          :link-href="author.path"
          :img-alt="author.name"
          :img-src="author.avatar_url"
          :img-size="26"
          :tooltip-text="author.name"
          tooltip-placement="bottom"
        />
      </div>
      <button class="btn btn-link js-replies-text qa-expand-replies" type="button" @click="toggle">
        {{ replies.length }} {{ n__('reply', 'replies', replies.length) }}
      </button>
      {{ __('Last reply by') }}
      <a :href="lastReply.author.path" class="btn btn-link author-link">
        {{ lastReply.author.name }}
      </a>
      <time-ago-tooltip :time="lastReply.created_at" tooltip-placement="bottom" />
    </template>
    <span
      v-else
      class="collapse-replies-btn js-collapse-replies qa-collapse-replies"
      @click="toggle"
    >
      <gl-icon name="chevron-down" /> {{ s__('Notes|Collapse replies') }}
    </span>
  </li>
</template>
