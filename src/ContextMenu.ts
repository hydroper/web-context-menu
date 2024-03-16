import assert from "assert";
import { focusNextElement, focusPrevElement } from "focus-lock";
import { Input, shortcutDisplayText } from "com.hydroper.webinputaction";

export type ShortcutCombinationFunction = (action: string) => string;

export type ContextMenuOptions = {
    /**
     * List containing either `ContextMenuItem` or `ContextMenuSeparator`.
     */
    items: Object[],
    /**
     * Either an `MouseEvent` or `Array`.
     */
    at?: Object,
    /**
     * A `HTMLElement`.
     */
    below?: Object,
};

export class ContextMenu {
    private modal: HTMLElement;
    private readonly openLists: HTMLElement[] = [];
    private readonly domToItemListDescription = new Map<HTMLElement, Object[]>;
    private handleEscapeKey: Function;
    private handlePressedInput: Function;
    private handleWindowMouseDown: Function;

    public constructor(options: ContextMenuOptions) {
        this.modal = document.createElement("div");
        this.modal.ariaModal = "true";
        this.modal.role = "dialog";
        this.modal.className = "context-menu-modal";
        this.modal.addEventListener("mousedown", _e => {
            this.destroy();
        });
        document.body.appendChild(this.modal);

        const headerNavigationBar = document.querySelector("header > #navigationBar")!;
        const r = headerNavigationBar.getBoundingClientRect();
        this.modal.style.top = `${r.y + r.height}px`;

        this.handleEscapeKey = (evt: KeyboardEvent): void => {
            if (evt.key == "Escape") {
                this.escape();
            }
        };

        this.handlePressedInput = (_e: Event): void => {
            this.arrowNavigation();
        };

        this.handleWindowMouseDown = (evt: MouseEvent): void => {
            const r = this.modal.getBoundingClientRect();
            if (evt.clientX < r.x || evt.clientX > r.x + r.width
            || evt.clientY < r.y || evt.clientY > r.y + r.height) {
                this.destroy();
            }
        };

        assert(options.below !== undefined || options.at !== undefined, "One of the 'below' or 'at' options must be specified.");
        this.renderItemList(options.items, options.below ?? options.at, options.below !== undefined);

        setTimeout(() => {
            window.addEventListener("mousedown", this.handleWindowMouseDown as any);
        }, 50);
        window.addEventListener("keydown", this.handleEscapeKey as any);
        Input.input.addEventListener("inputPressed", this.handlePressedInput as any);
    }

    private renderItemList(itemList: Object[], position: Object, below: boolean): HTMLElement {
        const renderedList = document.createElement("div");
        renderedList.className = "context-menu";
        renderedList.addEventListener("mousedown", e => {
            e.preventDefault();
        });
        this.modal.appendChild(renderedList);
        this.openLists.push(renderedList);
        this.domToItemListDescription.set(renderedList, itemList);

        // Render items
        for (const item of itemList) {
            renderedList.appendChild(this.renderItem(item, this.openLists.length));
        }

        const renderedRect = renderedList.getBoundingClientRect();

        // Position
        let finalX = 0;
        let finalY = 0;
        if (position instanceof HTMLElement) {
            const positionRect = position.getBoundingClientRect();
            if (below) {
                finalX = positionRect.x;
                finalY = positionRect.y + positionRect.height;
            } else {
                finalX = positionRect.x + positionRect.width;
                finalX = finalX > window.innerWidth ? positionRect.x - renderedRect.width : finalX;
                finalY = positionRect.y + positionRect.height / 2 - renderedRect.height / 2;
            }
        } else if (position instanceof MouseEvent) {
            finalX = position.clientX;
            finalY = position.clientY;
        } else if (position instanceof Array) {
            finalX = position[0];
            finalY = position[1];
        } else {
            throw new Error("Unrecognized position argument");
        }
        finalX = finalX > window.innerWidth ? window.innerWidth - renderedRect.width : finalX;
        finalY = finalY > window.innerHeight ? window.innerHeight - renderedRect.height : finalY;
        renderedList.style.left = finalX + "px";
        renderedList.style.top = finalY + "px";

        // Focus first button
        setTimeout(() => {
            focusNextElement(renderedList.lastElementChild!, {
                scope: renderedList,
            });
        }, 10);

        return renderedList;
    }

    private renderItem(item: Object, openListsLengthUntilParentList: number): HTMLElement {
        if (item instanceof ContextMenuItem) {
            const parentList = this.openLists[this.openLists.length - 1];
            const renderedItem = document.createElement("button");
            renderedItem.disabled = item.disabled;
            const listCharacter = item.list != null ? "&gt;" : "";
            const shortcut = item.shortcutAction != null ? shortcutDisplayText(Input.input.getActions()[item.shortcutAction!]) : "";
            renderedItem.innerHTML = `<ul><span class="title">${item.title}</span><span class="right"><span class="shortcut">${shortcut}</span><span class="list">${listCharacter}</span></span></ul>`;
            renderedItem.addEventListener("mouseover", _e => {
                renderedItem.focus();
            });
            if (item.list != null) {
                renderedItem.addEventListener("focus", _e => {
                    parentList.setAttribute("data-focused-index", Array.from(parentList.children).indexOf(renderedItem).toString());
                });
                renderedItem.addEventListener("click", _e => {
                    this.openSubItemList(item, openListsLengthUntilParentList);
                });
            } else {
                renderedItem.addEventListener("click", _e => {
                    this.destroy();
                    item.action?.();
                });
            }
            return renderedItem;
        } else if (item instanceof ContextMenuSeparator) {
            const renderedItem = document.createElement("div");
            renderedItem.className = "context-menu-separator";
            return renderedItem;
        } else {
            throw new Error("Unmatched item");
        }
    }

    private openSubItemList(item: ContextMenuItem, openListsLengthUntilParentList: number): void {
        for (let list of this.openLists.slice(openListsLengthUntilParentList)) {
            list.remove();
        }
        this.openLists.length = openListsLengthUntilParentList;
        let blurTimeout: any = undefined;
        const subrenderedList = this.renderItemList(item.list!, this.openLists[this.openLists.length - 1], false);
        subrenderedList.addEventListener("mouseout", _e => {
            if (blurTimeout !== undefined) {
                clearTimeout(blurTimeout);
            }
            blurTimeout = setTimeout(() => {
                if (subrenderedList.parentElement != null) {
                    this.escape();
                }
            }, 1_000);
        });
        subrenderedList.addEventListener("mousemove", _e => {
            if (blurTimeout !== undefined) {
                clearTimeout(blurTimeout);
            }
        });
    }

    private destroy(): void {
        if (this.modal.parentElement == null) {
            return;
        }
        this.modal.remove();
        window.removeEventListener("mousedown", this.handleWindowMouseDown as any);
        window.removeEventListener("keydown", this.handleEscapeKey as any);
        Input.input.removeEventListener("inputPressed", this.handlePressedInput as any);
    }

    private escape(): void {
        const list = this.openLists.pop();
        list!.remove();
        if (this.openLists.length == 0) {
            this.destroy();
        } else {
            setTimeout(() => {
                const list = this.openLists[this.openLists.length - 1];
                const lastFocusedIndex = list.getAttribute("data-focused-index");
                if (lastFocusedIndex != null) {
                    setTimeout(() => {
                        (list.children[Number(lastFocusedIndex)] as HTMLElement).focus();
                    }, 10);
                }
            }, 10);
        }
    }

    private arrowNavigation(): void {
        if (Input.input.isPressed("navigateLeft")) {
            // Left
            this.escape();
        } else if (Input.input.isPressed("navigateRight")) {
            // Right
            if (document.activeElement == null) {
                return;
            }
            const renderedItemList = document.activeElement!.parentElement!;
            if (renderedItemList.parentElement == this.modal) {
                const renderedItemIndex = Array.from(renderedItemList.children).indexOf(document.activeElement!);
                const abstractItemList = this.domToItemListDescription.get(renderedItemList)!;
                const listIndex = this.openLists.indexOf(renderedItemList);
                const openListsLengthUntilParentList = listIndex + 1;
                const item = abstractItemList.find((_value, index) => {
                    return index == renderedItemIndex;
                })! as ContextMenuItem;
                if (item.list != null) {
                    this.openSubItemList(item, openListsLengthUntilParentList);
                }
            }
        } else if (Input.input.isPressed("navigateUp") && document.activeElement != null) {
            // Up
            if (document.activeElement == null) {
                return;
            }
            const renderedItemList = document.activeElement!.parentElement!;

            if (renderedItemList.parentElement == this.modal) {
                focusPrevElement(document.activeElement!, {
                    scope: renderedItemList,
                });
            }
        } else if (Input.input.isPressed("navigateDown") && document.activeElement != null) {
            // Down
            if (document.activeElement == null) {
                return;
            }
            const renderedItemList = document.activeElement!.parentElement!;

            if (renderedItemList.parentElement == this.modal) {
                focusNextElement(document.activeElement!, {
                    scope: renderedItemList,
                });
            }
        }
    }
}

export class ContextMenuSeparator {}

export class ContextMenuItem {
    public title: string;
    public action: (() => void) | null;
    public list: Object[] | null;
    public shortcutAction: string | null;
    public disabled: boolean;

    public constructor(options: ContextMenuItemOptions) {
        this.title = options.title;
        this.action = options.action || null;
        this.list = options.list || null;
        this.shortcutAction = options.shortcutAction || null;
        this.disabled = options.disabled === undefined ? false : !!options.disabled;
    }
}

export type ContextMenuItemOptions = {
    title: string,
    action?: () => void,
    list?: Object[],
    shortcutAction?: string,
    disabled?: boolean,
};