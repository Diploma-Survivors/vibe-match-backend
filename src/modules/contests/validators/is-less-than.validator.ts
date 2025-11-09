// NestJS
import { Injectable } from '@nestjs/common';

// Third-party
import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

export const LESS_THAN_VALIDATOR = 'LESS_THAN_VALIDATOR';

@ValidatorConstraint({ name: LESS_THAN_VALIDATOR, async: false })
@Injectable()
export class IsLessThanValidator<T> implements ValidatorConstraintInterface {
  validate(value: T, args: ValidationArguments): Promise<boolean> | boolean {
    if (!value) {
      return false;
    }

    const [relatedPropertyName] = args.constraints as string[];
    const relatedValue = args?.object?.[relatedPropertyName] as T;
    if (!relatedValue) {
      return true;
    }

    return value < relatedValue;
  }

  defaultMessage(args?: ValidationArguments): string {
    return `${args?.property} must be less than ${args?.constraints[0]}`;
  }
}
