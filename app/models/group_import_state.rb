# frozen_string_literal: true

class GroupImportState < ApplicationRecord
  self.primary_key = :group_id

  belongs_to :group, inverse_of: :import_state

  validates :group, :status, presence: true
  validates :jid, presence: true, if: -> { started? || finished? }

  state_machine :status, initial: :created do
    state :created, value: 0
    state :started, value: 1
    state :finished, value: 2
    state :failed, value: -1

    event :start do
      transition created: :started
    end

    event :finish do
      transition started: :finished
    end

    event :fail_op do
      transition any => :failed
    end

    after_transition any => :failed do |state, transition|
      last_error = transition.args.first

      state.update_column(:last_error, last_error) if last_error
    end
  end

  def in_progress?
    created? || started?
  end
end
