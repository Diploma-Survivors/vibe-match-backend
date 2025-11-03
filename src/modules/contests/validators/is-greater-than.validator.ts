// NestJS
import { Injectable } from '@nestjs/common';

// Third-party
import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

export const GREATER_THAN_VALIDATOR = 'GREATER_THAN_VALIDATOR';

@ValidatorConstraint({ name: GREATER_THAN_VALIDATOR, async: false })
@Injectable()
export class IsGreaterThanValidator<T> implements ValidatorConstraintInterface {
  validate(value: T, args: ValidationArguments): Promise<boolean> | boolean {
    if (!value) {
      return false;
    }

    const [relatedPropertyName] = args.constraints as string[];
    const relatedValue = args?.object?.[relatedPropertyName] as T;
    if (!relatedValue) {
      return true;
    }

    return value > relatedValue;
  }

  defaultMessage(args?: ValidationArguments): string {
    return `${args?.property} must be greater than ${args?.constraints[0]}`;
  }
}
