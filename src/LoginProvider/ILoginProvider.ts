
export interface ILoginProvider {
    Login(): Promise<boolean>;
}
