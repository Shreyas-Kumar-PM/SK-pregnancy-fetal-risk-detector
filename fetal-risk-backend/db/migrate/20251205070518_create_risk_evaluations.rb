class CreateRiskEvaluations < ActiveRecord::Migration[8.1]
  def change
    create_table :risk_evaluations do |t|
      t.references :patient, null: false, foreign_key: true
      t.references :reading, null: false, foreign_key: true
      t.string :risk_level
      t.float :risk_score
      t.text :reason

      t.timestamps
    end
  end
end
