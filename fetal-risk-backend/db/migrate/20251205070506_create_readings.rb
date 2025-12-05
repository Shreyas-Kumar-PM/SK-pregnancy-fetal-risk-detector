class CreateReadings < ActiveRecord::Migration[8.1]
  def change
    create_table :readings do |t|
      t.references :patient, null: false, foreign_key: true
      t.integer :maternal_hr
      t.integer :systolic_bp
      t.integer :diastolic_bp
      t.integer :fetal_hr
      t.integer :fetal_movement_count
      t.integer :spo2
      t.float :temperature
      t.datetime :recorded_at

      t.timestamps
    end
  end
end
