document.addEventListener('DOMContentLoaded', () => {
    const containers = document.querySelectorAll('.container');
    const initialCardCounts = { A: 5, B: 5, C: 5, D: 5 };
    let draggedCard = null;

    // --- Initial Card Generation ---
    function createCard(group, index) {
        const card = document.createElement('div');
        card.classList.add('card', `card-group-${group.toLowerCase()}`);
        card.setAttribute('draggable', 'true');
        card.setAttribute('data-group', group);
        card.id = `card-${group.toLowerCase()}-${index}`;
        card.textContent = `卡片 ${group}${index}`;
        return card;
    }

    function initializeCards() {
        for (const group in initialCardCounts) {
            const cardList = document.querySelector(`.container-${group.toLowerCase()} .card-list`);
            if (cardList) {
                for (let i = 1; i <= initialCardCounts[group]; i++) {
                    const card = createCard(group, i);
                    cardList.appendChild(card);
                }
            }
        }
        addDragListenersToCards();
    }

    // --- Drag and Drop Event Handlers ---
    function handleDragStart(event) {
        draggedCard = event.currentTarget;
        event.dataTransfer.setData('text/plain', event.currentTarget.id);
        event.dataTransfer.effectAllowed = 'move';
        setTimeout(() => {
             // Check if draggedCard still exists before adding class
             if(draggedCard) {
                draggedCard.classList.add('dragging');
             }
        }, 0);
        console.log(`Drag Start: ${draggedCard?.id}`); // Use optional chaining
    }

    function handleDragEnd(event) {
         if (draggedCard) {
            draggedCard.classList.remove('dragging');
            console.log(`Drag End: ${draggedCard.id}`);
            // Clear reference ONLY AFTER checking it exists
            draggedCard = null;
        } else {
             console.log("Drag End: No dragged card reference found.");
        }
        // Clean up any stray drag-over classes
        document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    }

    function handleDragOver(event) {
        event.preventDefault();
        const dropTarget = event.target.closest('.droppable');
        if (dropTarget) {
            if (dropTarget.classList.contains('slot-dropzone') && dropTarget.children.length > 0 && dropTarget.children[0] !== draggedCard) {
                 event.dataTransfer.dropEffect = 'none';
                 clearDragOverClasses(); // Clear visual cue if not droppable
            } else {
                event.dataTransfer.dropEffect = 'move';
                clearDragOverClasses();
                dropTarget.classList.add('drag-over');
            }
        } else {
             event.dataTransfer.dropEffect = 'none';
             clearDragOverClasses();
        }
    }

    function handleDragLeave(event) {
        const relatedTarget = event.relatedTarget;
        const currentTarget = event.target.closest('.droppable');
         if (currentTarget && (!relatedTarget || !currentTarget.contains(relatedTarget))) {
             currentTarget.classList.remove('drag-over');
         }
        if (event.target.classList.contains('slot-dropzone') || event.target.classList.contains('card-list')) {
             event.target.classList.remove('drag-over');
        }
    }

    // --- NEW HELPER FUNCTION ---
    // Finds the sibling element before which the dragged element should be inserted
    function findInsertBeforeElement(listElement, yPosition, draggedElementId) {
        let insertBefore = null;
        // Get all direct children (cards) of the list, convert NodeList to Array
        const siblings = Array.from(listElement.children);

        for (const sibling of siblings) {
            // Skip the element being dragged
            if (sibling.id === draggedElementId) {
                continue;
            }

            const rect = sibling.getBoundingClientRect();
            const midpointY = rect.top + rect.height / 2;

            // If the drop position is above the midpoint of the sibling,
            // then we should insert *before* this sibling.
            if (yPosition < midpointY) {
                insertBefore = sibling;
                break; // Found the correct position, exit loop
            }
        }
        // If loop completes, insertBefore remains null, meaning append at the end
        return insertBefore;
    }


    // --- UPDATED handleDrop FUNCTION ---
    function handleDrop(event) {
        event.preventDefault();
        const cardId = event.dataTransfer.getData('text/plain');
        // Ensure draggedCard is available before accessing properties
        // It might be null if drag ended prematurely or unexpectedly
        const droppedCardElement = document.getElementById(cardId);
        const dropTarget = event.target.closest('.droppable');

        clearDragOverClasses();

        if (!droppedCardElement) {
             console.warn("Drop failed: Could not find the dragged card element by ID:", cardId);
             // Make sure draggedCard reference is cleared if element is gone
             if (draggedCard && draggedCard.id === cardId) draggedCard = null;
             return;
        }
         if (!dropTarget) {
             console.warn("Drop failed: No valid drop target found.");
             return;
         }

        const originalGroup = droppedCardElement.dataset.group;
        let targetGroup = '';

        // 1. Dropping into a Card List (A, B, C, D, H)
        if (dropTarget.classList.contains('card-list')) {
            targetGroup = dropTarget.closest('.container').dataset.group;

            // --- REORDERING LOGIC ---
            const insertBeforeElement = findInsertBeforeElement(dropTarget, event.clientY, droppedCardElement.id);

            if (insertBeforeElement) {
                // Insert before the found element
                dropTarget.insertBefore(droppedCardElement, insertBeforeElement);
                console.log(`Reordered ${droppedCardElement.id} before ${insertBeforeElement.id} in list ${targetGroup}`);
            } else {
                // Append to the end of the list
                dropTarget.appendChild(droppedCardElement);
                console.log(`Reordered/Appended ${droppedCardElement.id} to end of list ${targetGroup}`);
            }
            // --- END REORDERING LOGIC ---

            // Update color ONLY if moving to a DIFFERENT group
            if (originalGroup !== targetGroup) {
                updateCardStyle(droppedCardElement, targetGroup);
            }
        }
        // 2. Dropping into a Slot (E, F, G)
        else if (dropTarget.classList.contains('slot-dropzone')) {
            if (dropTarget.children.length === 0) {
                targetGroup = dropTarget.dataset.group;
                dropTarget.appendChild(droppedCardElement);
                updateCardStyle(droppedCardElement, targetGroup);
                console.log(`Dropped ${droppedCardElement.id} into slot of group ${targetGroup}`);
            } else {
                 console.log(`Slot in group ${dropTarget.dataset.group} is full. Drop rejected.`);
            }
        }

        // Dragged card reference should be cleared in handleDragEnd
    }

    function clearDragOverClasses() {
         document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    }

    function updateCardStyle(card, newGroup) {
        const oldGroup = card.dataset.group;
        card.classList.remove(`card-group-${oldGroup.toLowerCase()}`);
        card.classList.add(`card-group-${newGroup.toLowerCase()}`);
        card.dataset.group = newGroup;
        console.log(`Updated ${card.id} style from group ${oldGroup} to ${newGroup}`);
    }

    function addDragListenersToCards() {
        const cards = document.querySelectorAll('.card');
        cards.forEach(card => {
             card.removeEventListener('dragstart', handleDragStart);
             card.removeEventListener('dragend', handleDragEnd);
             card.addEventListener('dragstart', handleDragStart);
             card.addEventListener('dragend', handleDragEnd);
        });
         // We might need to re-add listeners if cards are added dynamically later
         // For now, this runs once on initialization
    }

    function addDropListeners() {
        const droppables = document.querySelectorAll('.droppable');
        droppables.forEach(droppable => {
            droppable.removeEventListener('dragover', handleDragOver);
            droppable.removeEventListener('dragleave', handleDragLeave);
            droppable.removeEventListener('drop', handleDrop);

            droppable.addEventListener('dragover', handleDragOver);
            droppable.addEventListener('dragleave', handleDragLeave);
            droppable.addEventListener('drop', handleDrop);
        });
    }

    // --- Initialization ---
    initializeCards();
    addDropListeners();

}); // End DOMContentLoaded