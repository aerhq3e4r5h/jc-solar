/** Badge colours for order statuses in the admin. */
export const STATUS_TONE: Record<string, string> = {
  paid: "bg-sun/25 text-foreground",
  processing: "bg-sun/25 text-foreground",
  shipped: "bg-sky-500/15 text-foreground",
  delivered: "bg-success/15 text-success",
  pending_payment: "bg-muted text-muted-foreground",
  cancelled: "bg-muted text-muted-foreground line-through",
  expired: "bg-muted text-muted-foreground",
};
