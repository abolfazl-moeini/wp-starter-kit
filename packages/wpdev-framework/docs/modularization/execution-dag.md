# WPDev Execution DAG

```mermaid
flowchart TD
  P0[P0_Normalize] --> R1[R1_Regression]
  P0 --> D1[D1_ModuleGraph]
  R1 --> A1[A1_ResolverContract]
  D1 --> A1
  A1 --> A2[A2_PaymentsWire]
  A2 --> A3[A3_BreakCycle]
  A3 --> B1[B1_AjaxContract]
  B1 --> B2[B2_Modal]
  B1 --> B3[B3_AddonsTabs]
  A3 --> F1[F_FieldSanitize]
  B3 --> Z[Z_Signoff]
  F1 --> M1[M_MetaboxAPI]
  M1 --> Z
  B2 --> Z
```

## Critical path

1. P0 → R1 + D1 (parallel)
2. A1 → A2 → A3 (break cycle before trusting full graph in production)
3. B1 → B2, B3
4. F → M
5. Z (all blockers green)

## Release blockers

R1, D1, A1–A3, B1, B3, F-01, M-01, M-03, Z2.

## Non-blockers (deferrable)

S-01 full settings monolith split, W-02 widget domain move, T-02/T-03 reference migrations beyond parity tests.
