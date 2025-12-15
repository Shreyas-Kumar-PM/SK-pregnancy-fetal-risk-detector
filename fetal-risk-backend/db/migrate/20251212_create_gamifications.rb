class CreateGamifications < ActiveRecord::Migration[8.1]
  def change
    create_table :gamifications do |t|
      t.references :user, null: false, foreign_key: true
      t.references :patient, null: true, foreign_key: true

      t.integer :streak_count, default: 0, null: false
      t.datetime :last_active_at
      t.integer :points, default: 0, null: false
      t.jsonb :badges, default: [], null: false

      t.timestamps
    end

    add_index :gamifications, [:user_id, :patient_id], unique: true
  end
end
