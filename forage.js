/**
 * The Forage Search Extension For Chrome
 * 
 * Developed by: Liam Seewald (aka jlhs1001) at 15 years old.
 * my github: https://github.com/jlhs1001
 * this repo: https://github.com/jlhs1001/forage-extension
 * 
 * Description:
 *  Forage replaces the capabilities of chrome's search tool,
 *  while adding significantly more powerful features such as
 *  regex pattern searching, and the ability to select a 
 *  particular DOM element, and search in just that scope.
 */

/* Utility Functions */

const elementUnderMouse = (ev) => {
    // it's it's just a lot to type.
    return document.elementFromPoint(ev.clientX, ev.clientY);
};

/* initialize styles for
   highlighting, hovering, and
   selecting elements. */
const style = document.createElement('style');
style.innerHTML = `
.forageDimHover {
    box-shadow: inset 0 0 0 100vmax rgba(0, 0, 255, 0.5) !important;
    user-select: none !important;
}

.forageSelectedScope {
    border: solid 1px orange !important;
}

.forageHighlight {
    background-color: yellow;
    color: black;
}

.forageSearchbarModal {
    position: fixed;
    z-index: 1000000 !important;
    right: 25px;
    top: 0;
    overflow: auto;
    border: solid 1px grey;
    background-color: white !important;
    width: fit-content;
    user-select: none;
}

.forageSearchBar {
    border: solid 1px grey;
    outline: none;
    width: 300px;
    height: 21px;
    font-size: large;
    margin: 2px;
    background-color: white;
    color: black;
}

.scopeSelectButton {
    background-color: white;
    color: black;
    border: solid 1px grey;
    font-size: large;
    margin: 0;
    margin-right: 2px;
}

.changeFocusButton {
    border: none;
    background-color: white;
    margin: 0;
    margin-right: 2px;
    font-size: x-small;
    font-weight: bolder;
    user-select: none;
    padding: 0;
    padding-bottom: 4px;
    cursor: pointer;
    color: black;
}

.scopeSelectButton:hover {
    background-color: rgb(240, 255, 240);
}
`;
document.head.appendChild(style);

// storing the matches here because
// I plan on accessing them from many
// places in the future.
let matches = [];
let matchIndex = 0;
let highlightedIndex = 0;

/**
 * Scope Selection Handling Code
 */

let scope = document.body; // by default the scope is the entire document
let hover = scope; // stores the current hovered element

let selectModeActive = false;
const handleHoverClick = (ev) => {
    /**
     * listens for a click event on the element the mosue
     * is currently hovering over. 
     * 
     * as for visual aspects, if the click event is detected,
     * add border to indicate where the search scope is,
     * then remove the hover highlight.
     * 
     * for functionality, set the scope to the clicked element,
     * remove this event listener, then disable select mode.
     */
    // prevent redirects if selected links
    ev.preventDefault();

    // set the search scope to the clicked element
    scope = hover;

    // change styling to reflect new state
    hover.classList.add("forageSelectedScope");
    hover.classList.remove("forageDimHover");

    // cleanup
    hover.removeEventListener('click', handleHoverClick);
    selectModeActive = false;
}

const handleMouseMove = (ev) => {
    /**
     * listens for a mouse move event anywhere on the document.
     * 
     * if the mouse is on a different element, update the hovered
     * element to the new one.
     */
    if (hover !== elementUnderMouse(ev) && selectModeActive) {
        // remove hover handling code and highlight
        hover.removeEventListener('click', handleHoverClick);
        hover.classList.remove('forageDimHover');

        // select the new element
        hover = document.elementFromPoint(ev.clientX, ev.clientY);

        // conform to the ignore list
        if (!hover.classList.contains("forageScopeNoSelect")) {
            // assign scope handling code to the new element
            hover.classList.add('forageDimHover');
            hover.addEventListener('click', handleHoverClick);
        }
    } 
}

/**
 * Search Input Handling Code
 */

let keysActive = [];
document.onkeydown = onkeyup = (ev) => {
    /**
     * It is what it says:
     *  whether a key is up or down,
     *  register accordingly.
     */
    ev.type === "keydown" 
        ? keysActive.push(ev.key)
        : keysActive.splice(ev.key, 1);
    
    if (keysActive.indexOf("Control") !== -1
        && keysActive.indexOf("F") !== -1) {
        // if the extension keystroke is detected,
        // display the searchbar.
        displaySearchBar();
    }
}

const matchCaseButton = document.createElement("button");
const nextMatchButton = document.createElement("button");
const prevMatchButton = document.createElement("button");

const matchCount = document.createElement("div");

let matchDisplayIndex = 1;

matchCount.style.color = "black";
matchCount.style.float = "right";

let matchCase = false;

let searchBarActive = false;
const displaySearchBar = () => {
    /**
     * The actual function to display the search bar.
     */

    // only display when it's not already active.
    if (searchBarActive) return;
    searchBarActive = true;

    /* create the modal that contains the search bar,
       set the styles, then set the innerHTML. */
    const modal = document.createElement("div");
    modal.className = "forageSearchbarModal";

    // create search bar and scope select button
    const searchBar = document.createElement("input");

    const scopeButton = document.createElement("button");
    initModalContent(modal, searchBar, scopeButton);

    // initialize the search functionality
    searchBar.oninput = () => search(searchBar);

    // place search bar and scope 
    // select button inside the modal
    modal.appendChild(searchBar);
    modal.appendChild(scopeButton);
    modal.appendChild(matchCaseButton);

    modal.appendChild(nextMatchButton);
    modal.appendChild(prevMatchButton);

    modal.appendChild(matchCount);

    // tell the scope selector
    // to ignore the following elements.
    scopeButton.classList.add('forageScopeNoSelect');
    searchBar.classList.add('forageScopeNoSelect');
    modal.classList.add('forageScopeNoSelect');

    // finally, place the search modal in the document.
    document.body.appendChild(modal);
    searchBar.focus();
}

const search = (searchBar) => {
    // reset match positions
    matchIndex = 0;
    highlightedIndex = 0;
    
    matchCount.innerText = `${matchIndex + highlightedIndex}/${matches.length}`;

    let regex;
    if (!searchBar.value.trim()) {
        matchCount.innerText = `0/0`;
        // search bar is empty or just whitespace.
        // reset all matches to their original state.
        for (const match of matches) {
            match[1].replaceWith(document.createTextNode(match[0].nodeValue));
        }
        return;
    } else if (searchBar.value.slice(-1) === '|') {
        // to prevent freeze issue
        return;
    }

    // reset all matches to their original state
    for (const match of matches) {
        match[1].replaceWith(match[0]);
    }

    // remove all matches
    matches = [];
    try {
        regex = new RegExp(searchBar.value, "g" + (matchCase ? "i" : ""));
    } catch { return; }

    /**
     * The TreeWalker:
     *  Grab all text nodes in current scope,
     *  search, highlight matches accordingly.
     */
    const walker = document.createTreeWalker(
        // walk through current scope
        scope,

        // filter for text only
        NodeFilter.SHOW_TEXT,

        { acceptNode: node => {
            // reject any textNodes inside 'script' elements
            if (node.parentElement instanceof HTMLScriptElement) {
                return NodeFilter.FILTER_REJECT;
            }

            const trimmedNodeValue = node.nodeValue.trim();
            // skip any textNodes that contain only whitespace
            if (trimmedNodeValue) {
                // create span that wraps textNode and matches
                const span = document.createElement("span");
                let nodeContainsMatch = false;

                // highlight matches, then set span contents to result.
                span.innerHTML = trimmedNodeValue.replace(regex,
                    match => {
                        nodeContainsMatch = true;
                        return `<span class="forageHighlight">${match}</span>`;
                    });
                
                if (node.nodeValue[0] === ' ')
                    span.innerHTML = ' ' + span.innerHTML;
                if (node.nodeValue.slice(-1) === ' ')
                    span.innerHTML += ' ';
                
                if (nodeContainsMatch) {
                    matches.push([node, span]);
                    return NodeFilter.FILTER_ACCEPT;
                }
                return NodeFilter.FILTER_REJECT;
            }
        }}
    );
    while (walker.nextNode());
    for (let node of matches) {
        node[0].replaceWith(node[1]);
    }

    matchCount.innerText = `${matchIndex + highlightedIndex}/${matches.length}`;
    matches[0][1].children[0].style.backgroundColor = "orange";
}

const initModalContent = (modal, searchBar, scopeButton) => {
    scopeButton.addEventListener("click", () => {
        selectModeActive = true;
        scope.classList.remove('forageSelectedScope');
        document.addEventListener('mousemove', handleMouseMove);
        document.body.style.cursor = "pointer";
    });

    scopeButton.innerText = "scope";
    matchCaseButton.innerText = "aA";
    nextMatchButton.innerText = "╲╱"
    prevMatchButton.innerText = "╱╲";

    scopeButton.className = "scopeSelectButton";
    matchCaseButton.className = "scopeSelectButton";
    nextMatchButton.className = "changeFocusButton";
    prevMatchButton.className = "changeFocusButton";
    searchBar.className = "forageSearchBar";

    matchCaseButton.onclick = () => {
        if (matchCase = !matchCase) {
            matchCaseButton.style.backgroundColor = "rgb(240, 255, 240)";
        } else {
            matchCaseButton.style.backgroundColor = "white";
        }
    };

    nextMatchButton.onclick = () => {
        if (matches.length <= 0) return;
        matchCount.innerText = `${++matchDisplayIndex}/${matches.length}`;
        matches[matchIndex][1].children[highlightedIndex].style.backgroundColor = "yellow";
        if (++highlightedIndex >= matches[matchIndex][1].children.length) {
            if (++matchIndex >= matches.length) {
                matchIndex = 0;
                matchCount.innerText = `${matchDisplayIndex = 1}/${matches.length}`;
            }
            highlightedIndex = 0;
        }
        matches[matchIndex][1].children[highlightedIndex].style.backgroundColor = "orange";
        matches[matchIndex][1].scrollIntoView({
            behavior: 'instant',
            block: 'center',
            inline: 'center'
        });
    }

    prevMatchButton.onclick = () => {
        if (matches.length <= 0) return;
        matchCount.innerText = `${--matchDisplayIndex}/${matches.length}`;
        matches[matchIndex][1].children[highlightedIndex].style.backgroundColor = "yellow";
        if (--highlightedIndex < 0) {
            if (--matchIndex < 0) {
                matchIndex = matches.length - 1;
                matchCount.innerText = `${matchDisplayIndex = matches.length}/${matches.length}`;
            }
            highlightedIndex = matches[matchIndex][1].children.length - 1;
        }

        matches[matchIndex][1].children[highlightedIndex].style.backgroundColor = "orange";
        matches[matchIndex][1].scrollIntoView({
            behavior: 'instant',
            block: 'center',
            inline: 'center'
        });
    }
}