-- Adiciona campos de input persistido para habilitar Regenerar.
-- Sprint: guarda a descrição de capacidade e a indicação de objetivo
--         que o usuário forneceu (não só o output do agente).
-- CeremonyRecord: guarda as anotações brutas + contexto adicional,
--         para permitir regerar a ata sobre o mesmo input.

ALTER TABLE sprint ADD COLUMN capacity_description TEXT;
ALTER TABLE sprint ADD COLUMN goal_hint TEXT;

ALTER TABLE ceremony_record ADD COLUMN raw_notes TEXT NOT NULL DEFAULT '';
ALTER TABLE ceremony_record ADD COLUMN additional_context TEXT;
