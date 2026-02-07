# Implementation Plan - Endereçamento Module

This plan outlines the steps to implement the new "Endereçamento" (Addressing) module and refactor the home screen to allow module selection.

## User Review Required

> [!IMPORTANT] > **API Endpoints**: I will assume the following API endpoints/services are available or need to be created. Please confirm their paths/signatures:
>
> 1.  `GET /produtos/{codigo}` - To check if product exists and get details (id, description, current address, stock quantity).
> 2.  `GET /enderecos/{codigo}` - To check if address exists.
> 3.  `PUT /produtos/{id}/endereco` - To update the product address. Body: `{ novoEndereco: string }`.

> [!WARNING] > **Navigation Change**: The current `/home` route will now be a selection screen. The existing "Guardas" dashboard will be moved to `/guardas`. This might affect any deep links or hardcoded navigations to `/home` expecting the dashboard.

## Proposed Changes

### Navigation & Home Refactor

#### [MODIFY] [home.tsx](file:///c:/Users/joao.peixoto/Documents/ze-do-bip/app/home.tsx)

- Refactor this file to be the **Module Selection Screen**.
- It will contain two main buttons/cards:
  - "Guardas": Navigates to `/guardas`.
  - "Endereçamento": Navigates to `/enderecamento`.
- The existing logic (Guardas Dashboard) will be moved to `app/guardas/index.tsx`.

#### [NEW] [app/guardas/index.tsx](file:///c:/Users/joao.peixoto/Documents/ze-do-bip/app/guardas/index.tsx)

- This file will contain the _previous_ content of [app/home.tsx](file:///c:/Users/joao.peixoto/Documents/ze-do-bip/app/home.tsx) (The Guardas Dashboard).
- Update imports to point correctly to components/contexts.

#### [NEW] [app/enderecamento/index.tsx](file:///c:/Users/joao.peixoto/Documents/ze-do-bip/app/enderecamento/index.tsx)

- New screen for the Address Change flow.
- **State Management**:
  - `step`: 1 (Product), 2 (Address), 3 (Count), 4 (Submit).
  - `product`: Product data (null initially).
  - `newAddress`: String.
  - `count`: Number.
- **Components**:
  - Input for Product (Autofocus).
  - Input for Address (Enabled only after Product is valid).
  - Button "Verificar Endereço".
  - [ModalContador](file:///c:/Users/joao.peixoto/Documents/ze-do-bip/app/leitura/_components/ModalContador.tsx#20-35) (Reused from [app/leitura/_components/ModalContador.tsx](file:///c:/Users/joao.peixoto/Documents/ze-do-bip/app/leitura/_components/ModalContador.tsx)) for stock verification.
- **Logic**:
  - **Step 1**: On product scan/enter -> Call API to validate. If valid -> Step 2.
  - **Step 2**: On address scan/enter -> Call API to validate. If valid -> Step 3.
  - **Step 3**: Open [ModalContador](file:///c:/Users/joao.peixoto/Documents/ze-do-bip/app/leitura/_components/ModalContador.tsx#20-35). User scans items. If count matches `product.quantity` -> Step 4.
  - **Step 4**: Auto-call update endpoint. Show success/error feedback.

### Services

#### [NEW] [services/EnderecamentoService.ts](file:///c:/Users/joao.peixoto/Documents/ze-do-bip/services/EnderecamentoService.ts)
-   Create a new service `EnderecamentoService` to handle the specific API calls for this module.
-   **Methods**:
    -   [buscarProduto(codigo: string)](file:///c:/Users/joao.peixoto/Documents/ze-do-bip/services/CodigoProcessorService.ts#57-109): `GET /produtos/buscar?codigo={codigo}` (or similar). Returns product details including current address and `quantidade` (stock).
    -   `verificarEndereco(codigo: string)`: `GET /enderecos/{codigo}/verificar`. Returns validity.
    -   `atualizarEndereco(produtoId: number, novoEndereco: string)`: `PUT /produtos/{produtoId}/endereco`. Body: `{ novoEndereco }`.

### Navigation Updates

#### [MODIFY] [app/_layout.tsx](file:///c:/Users/joao.peixoto/Documents/ze-do-bip/app/_layout.tsx)
-   Ref update the stack screens.
-   Rename `home` route to `guardas` (optional, or keep generic names).
-   Add `enderecamento` screen.


## Verification Plan

### Automated Tests

- Since this is a UI-heavy task with physical scanning interactions, automated unit tests for the UI might be limited without a full Jest setup (which doesn't seem fully configured for UI testing based on file list).
- I will verify the build using `npx expo type-check` (if available) or by running a dry run of the build command if possible.

### Manual Verification

1.  **Login Flow**: Restart app -> Login -> Should see "Selection Screen" (Guardas vs Endereçamento).
2.  **Guardas Flow**: Click "Guardas" -> Should see the original dashboard with no regressions.
3.  **Endereçamento Flow**:
    - Click "Endereçamento".
    - **Step 1**: Type an invalid product code -> Alert/Error.
    - **Step 1**: Type a valid product code -> Input locks/validates -> Focus moves to Address Input.
    - **Step 2**: Type an invalid address -> Alert/Error.
    - **Step 2**: Type a valid address -> Modal Counter opens.
    - **Step 3 (Counter)**:
      - Scan/Count items.
      - If quantity < stock -> "Confirm" disabled.
      - If quantity == stock -> "Confirm" enabled.
    - **Step 4**: Click Confirm -> Success Message -> Redirect/Reset to start.
