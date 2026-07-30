ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'OWNER';

ALTER TABLE "Tenant" ADD COLUMN "userId" TEXT;
CREATE UNIQUE INDEX "Tenant_userId_key" ON "Tenant"("userId");
ALTER TABLE "Tenant"
  ADD CONSTRAINT "Tenant_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "PropertyOwner" (
  "userId" TEXT NOT NULL,
  "propertyId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PropertyOwner_pkey" PRIMARY KEY ("userId", "propertyId")
);

CREATE INDEX "PropertyOwner_propertyId_idx" ON "PropertyOwner"("propertyId");

ALTER TABLE "PropertyOwner"
  ADD CONSTRAINT "PropertyOwner_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PropertyOwner"
  ADD CONSTRAINT "PropertyOwner_propertyId_fkey"
  FOREIGN KEY ("propertyId") REFERENCES "Property"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
