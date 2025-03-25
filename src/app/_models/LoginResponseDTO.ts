export interface LoginResponseDTO{
  userId: number;
  accessToken: string;
  refreshToken: string;
  expiration: Date;
}