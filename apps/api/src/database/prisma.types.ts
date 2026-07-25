import {Prisma} from "@/generated/prisma/client";
import {PrismaService} from "@/database/prisma.service";

export type DbClient = PrismaService | Prisma.TransactionClient;

export type TxClient = Prisma.TransactionClient;

export type Decimal = Prisma.Decimal;

export type JsonValue = Prisma.InputJsonValue;

export type JsonObject = Prisma.InputJsonObject;

export type JsonArray = Prisma.InputJsonArray;

export type PrismaTransaction = Parameters<PrismaService["$transaction"]>[0] extends (tx: infer T) => Promise<any> ? T : never;