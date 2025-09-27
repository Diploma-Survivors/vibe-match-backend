import { Injectable } from '@nestjs/common';
import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

export const AFTER_TIME_VALIDATOR = 'AFTER_TIME_VALIDATOR';

@ValidatorConstraint({ name: AFTER_TIME_VALIDATOR, async: false })
@Injectable()
export class IsLessThanValidator<T> implements ValidatorConstraintInterface {
  validate(value: T, args: ValidationArguments): Promise<boolean> | boolean {
    const [relatedPropertyName] = args.constraints as string[];
    const relatedValue = args?.object?.[relatedPropertyName] as T;

    return value < relatedValue;
  }

  defaultMessage(args?: ValidationArguments): string {
    return `${args?.property} must be less than ${args?.constraints[0]}`;
  }
}
