import { useImperativeHandle, forwardRef } from "react";
import type { Ref } from "react";

import type { ILocalVault } from "../../../types/local";
import { Modal } from "../../ui/Modal";
import { usePreview } from "./usePreview";
import { useCarousel } from "./useCarousel";
import { PreviewHeader } from "./PreviewHeader";
import { PreviewBody } from "./PreviewBody";
import { PreviewFooter } from "./PreviewFooter";

export interface IPreviewOverlayHandle {
  open: (vault: ILocalVault) => void;
  close: () => void;
}

interface IProps {
  vaults: ILocalVault[];
}

export const PreviewOverlay = forwardRef(
  ({ vaults }: IProps, ref: Ref<IPreviewOverlayHandle>) => {
    const { vault, currentIndex, open, close, prev, next } =
      useCarousel(vaults);
    const { url, isLoading, error } = usePreview(vault);

    useImperativeHandle(ref, () => ({ open, close }));

    return (
      <Modal
        opened={vault !== null}
        onClose={close}
        fullScreen
        withCloseButton={false}
        padding={0}
        styles={{
          body: {
            height: "100vh",
            display: "flex",
            flexDirection: "column",
          },
        }}
      >
        {vault && (
          <>
            <PreviewHeader vault={vault} onClose={close} />
            <PreviewBody
              vault={vault}
              url={url}
              isLoading={isLoading}
              error={error}
            />
            <PreviewFooter
              currentIndex={currentIndex}
              total={vaults.length}
              onPrev={prev}
              onNext={next}
            />
          </>
        )}
      </Modal>
    );
  },
);
