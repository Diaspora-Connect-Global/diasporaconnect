import { gql } from '@apollo/client';

export const REGISTER_USER = gql`
  mutation RegisterUser($input: RegisterUserInput!) {
    registerUser(input: $input) {
      success
      registrationToken
      expiresIn
      message
      verificationMethod
      smsSent
      verificationExpiresAt
      verificationTtlSeconds
      meta {
        registrationFlow
        userEmail
        phoneNumber
      }
    }
  }
`;

export const VERIFY_OTP = gql`
  mutation VerifyOtp($registrationToken: String!, $otp: String!) {
    verifyRegistrationOtp(registrationToken: $registrationToken, otp: $otp) {
      success
      message
      sessionToken
      requires2fa
      user {
        id
        email
        firstName
        lastName
        role
      }
      deviceMetadata {
        fingerprint
        ipAddress
        userAgent
        deviceId
      }
    }
  }
`;


export interface CheckEmailAvailabilityResponse {
  checkEmailAvailability: boolean;
}

export const CHECK_EMAIL_AVAILABILITY = gql`
  query CheckEmailAvailability($email: String!) {
    isEmailAvailable(email: $email)
  }
`;


export interface CheckPhoneAvailabilityResponse {
  isPhoneAvailable: boolean;
}

export const CHECK_PHONE_AVAILABILITY = gql`
  query CheckPhoneAvailability($phoneNumber: String!) {
    isPhoneAvailable(phoneNumber: $phoneNumber)
  }
`;