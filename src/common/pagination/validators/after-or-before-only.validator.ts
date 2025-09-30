import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { CursorQueryDto } from '../dtos/cursor-query.dto';

export const AFTER_OR_BEFORE_ONLY = 'AfterOrBeforeOnly';

@ValidatorConstraint({ name: AFTER_OR_BEFORE_ONLY, async: false })
export class AfterOrBeforeOnly implements ValidatorConstraintInterface {
  validate(
    _: any,
    validationArguments?: ValidationArguments,
  ): Promise<boolean> | boolean {
    const obj = validationArguments?.object as CursorQueryDto;
    return !obj.after || !obj.before;
  }

  defaultMessage(args?: ValidationArguments): string {
    return `${args?.property} must have either 'after' or 'before' property, but not both`;
  }
}
