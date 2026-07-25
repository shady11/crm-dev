import type {UnitStatus, UnitType} from "./unit.types";

export type CreateUnitPayload = {
    number: string;
    type?: UnitType;
    status?: UnitStatus;
    rooms?: number;
    area: number;
    price: number;
};

export type UpdateUnitPayload = Partial<CreateUnitPayload>;