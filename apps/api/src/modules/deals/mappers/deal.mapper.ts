import {Injectable} from '@nestjs/common';

import {DealDetails, DealListItem} from './deals.types';

@Injectable()
export class DealMapper {
    toListItem(deal: DealListItem) {
        return {
            ...deal,

            listPrice: Number(deal.listPrice),
            salePrice: Number(deal.salePrice),

            discountAmount:
                deal.discountAmount == null
                    ? null
                    : Number(deal.discountAmount),

            discountPercent:
                deal.discountPercent == null
                    ? null
                    : Number(deal.discountPercent),

            deposit:
                deal.deposit == null
                    ? null
                    : Number(deal.deposit),

            unit: {
                ...deal.unit,

                area: Number(deal.unit.area),

                price: Number(deal.unit.price),

                pricePerSqm:
                    deal.unit.pricePerSqm == null
                        ? null
                        : Number(deal.unit.pricePerSqm),
            },
        };
    }

    toDetails(deal: DealDetails) {
        return {
            ...this.toListItem(deal),

            payments: deal.payments.map(payment => ({
                ...payment,

                amount: Number(payment.amount),
            })),

            paymentSchedules: deal.paymentSchedules.map(schedule => ({
                ...schedule,

                amount: Number(schedule.amount),

                paidAmount: Number(schedule.paidAmount),
            })),
        };
    }

    toList(deals: DealListItem[]) {
        return deals.map(deal => this.toListItem(deal));
    }
}