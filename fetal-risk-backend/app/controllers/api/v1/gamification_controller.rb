# app/controllers/api/v1/gamification_controller.rb
module Api
  module V1
    class GamificationController < ApplicationController
      before_action :authorize_request

      # GET /api/v1/gamification
      def show
        gamification = find_or_build_gamification
        render json: gamification_json(gamification)
      end

      # PATCH /api/v1/gamification
      # body: { action_type: "record_activity" | "claim_reward" | "reset_streak", reward_id: optional }
      def update
        gamification = find_or_build_gamification

        action = params[:action_type].to_s
        case action
        when 'record_activity'
          handle_record_activity(gamification)
        when 'claim_reward'
          reward_id = params[:reward_id]
          handle_claim_reward(gamification, reward_id)
        when 'reset_streak'
          handle_reset_streak(gamification)
        else
          return render json: { error: "Unknown action_type: #{action}" }, status: :bad_request
        end

        if gamification.save
          render json: gamification_json(gamification)
        else
          render json: { errors: gamification.errors.full_messages }, status: :unprocessable_entity
        end
      end

      private

      def find_or_build_gamification
        # adjust patient lookup if your app uses different association
        patient = current_user.patient
        gamification = Gamification.find_or_create_by!(user: current_user, patient: patient) do |g|
          g.streak_count = 0
          g.points = 0
          g.badges = []
          g.last_active_at = nil
        end
        gamification
      end

      def handle_record_activity(g)
        # If last activity was more than 48 hours ago -> break streak (adjust as needed).
        now = Time.current
        if g.last_active_at.nil?
          g.streak_count = 1
        else
          # if activity same day -> don't increment multiple times
          if g.last_active_at.to_date == now.to_date
            # no change to streak if already reported today; optionally give points once per day
            return
          end

          # if last activity was yesterday -> continue streak
          if g.last_active_at.to_date == (now.to_date - 1)
            g.streak_count += 1
          else
            # otherwise reset streak
            g.streak_count = 1
          end
        end

        # award points for activity
        points_awarded = 10 + [g.streak_count - 1, 0].min * 2
        g.points += points_awarded
        g.last_active_at = now
      end

      def handle_claim_reward(g, reward_id)
        # simplistic example: check points and remove points when claimed; add a badge
        case reward_id.to_s
        when '10_points_reward'
          required = 50
          if g.points >= required
            g.points -= required
            g.badges << "10_points_claimed_#{Time.current.to_i}"
          else
            raise StandardError, "Not enough points to claim reward"
          end
        else
          # Generic reward flow — for now just add a badge
          g.badges << "reward_#{reward_id}_#{Time.current.to_i}"
        end
      end

      def handle_reset_streak(g)
        g.streak_count = 0
        g.last_active_at = nil
      end

      def gamification_json(g)
        {
          id: g.id,
          streak_count: g.streak_count,
          last_active_at: g.last_active_at,
          points: g.points,
          badges: g.badges,
          created_at: g.created_at,
          updated_at: g.updated_at
        }
      end
    end
  end
end

