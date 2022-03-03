/**
 * The Forage Search Extension For Chrome
 * 
 * Developed by: Liam Seewald (aka jlhs1001) at 15 years.
 * 
 * Description:
 *  Forage replaces the capabilities of chrome's search tool,
 *  while adding significantly more powerful features such as
 *  regex pattern searching, and the ability to select a 
 *  particular DOM element, and search in just that scope.
 */

/* initialize styles for
   highlighting, hovering, and
   selecting elements. */
const style = document.createElement('style');
style.innerHTML = `
.forageDimHover {
    box-shadow: inset 0 0 0 100vmax rgba(0, 0, 255, 0.5);
}

.forageSelectedScope {
    border: solid 1px orange;
}

.highlight {
    background-color: orange;
}
`;