-- Allow OAuth-only accounts without local password hash.
ALTER TABLE "User"
ALTER COLUMN "passwordHash" DROP NOT NULL;

-- Enforce unique provider identity when provider account ids are present.
CREATE UNIQUE INDEX "User_provider_providerId_key" ON "User"("provider", "providerId");
