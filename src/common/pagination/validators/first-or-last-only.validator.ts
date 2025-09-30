import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { CursorQueryDto } from '../dtos/cursor-query.dto';

export const FIRST_OR_LAST_ONLY = 'FirstOrLastOnly';

@ValidatorConstraint({ name: FIRST_OR_LAST_ONLY, async: false })
export class FirstOrLastOnly implements ValidatorConstraintInterface {
  validate(
    _: any,
    validationArguments?: ValidationArguments,
  ): Promise<boolean> | boolean {
    const obj = validationArguments?.object as CursorQueryDto;
    return !!obj.first !== !!obj.last;
  }

  defaultMessage(args?: ValidationArguments): string {
    return `${args?.property} must have either 'first' or 'last' property, but not both`;
  }
}
