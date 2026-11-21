/** An error from the Stride GH API (or Supabase), with what the screens need to show it. */
export class ApiError extends Error {
  status: number;
  /** true when the server could not be reached at all */
  offline: boolean;
  /** Field problems from the website's form check, keyed like "organiser.email". */
  fields: Record<string, string>;
  /** Machine-readable reason from the API, e.g. "account_exists". */
  code: string | null;
  /** Extra details sent with the error, e.g. { resendIn: 20 }. */
  extra: Record<string, unknown>;
  constructor(
    message: string,
    status: number,
    offline = false,
    fields: Record<string, string> = {},
    code: string | null = null,
    extra = {},
  ) {
    super(message);
    this.status = status;
    this.offline = offline;
    this.fields = fields;
    this.code = code;
    this.extra = extra;
  }
}
