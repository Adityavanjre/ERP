-- CreateTable
CREATE TABLE "ModelAccess" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "modelId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "permRead" BOOLEAN NOT NULL DEFAULT false,
    "permWrite" BOOLEAN NOT NULL DEFAULT false,
    "permCreate" BOOLEAN NOT NULL DEFAULT false,
    "permUnlink" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "ModelAccess_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "ModelDefinition" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ModelAccess_modelId_role_key" ON "ModelAccess"("modelId", "role");
