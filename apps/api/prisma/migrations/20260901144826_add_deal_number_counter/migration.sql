-- CreateTable
CREATE TABLE "DealNumberCounter" (
    "companyId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "lastSequence" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DealNumberCounter_pkey" PRIMARY KEY ("companyId","year")
);
