/* Victorian Curriculum topics for Year 8, 9 and 10, plus a VCE (Units 1-2) starter set — two solid topics per
   level, each with a lesson, worked examples and 15-18 questions across all three difficulties. These are
   genuinely new, harder maths: Pythagoras, linear graphs, trigonometry, simultaneous equations, quadratics,
   surds and indices, and VCE functions and probability.
   Reuses the mc()/num() helpers from topics-more.js (window.__moreTopicTools) and adds a point-answer helper
   for "give your answer as (x, y)" questions. Runs after topics-more.js, before app.js. */
(function () {
  "use strict";
  const { mc, num, build } = window.__moreTopicTools;
  // A question whose answer is a coordinate pair, graded the same way as the Cartesian plane topic.
  const pt = (d, prompt, x, y, explanation) => ({ d, prompt, answerType: "point", point: [x, y], answer: `(${x}, ${y})`.replace(/-/g, "−"), explanation });
  const make = (id, name, icon, info, list) => ({ id, name, icon, ...info, questions: build(`${id}-`, list) });

  // ================================================================ Year 8
  const year8 = [
    make("y8-pythagoras", "Pythagoras' Theorem", "📐", {
      blurb: "Finding a missing side of a right-angled triangle using a² + b² = c².",
      recap: "In any right-angled triangle, the square of the hypotenuse equals the sum of the squares of the other two sides.",
      example: "Builders use it to check a corner is a true right angle (the 3-4-5 rule), and it works out a TV's diagonal size from its width and height.",
      workedExample: {
        1: { question: "A right-angled triangle has legs 3 cm and 4 cm. Find the hypotenuse.", walkthrough: "c² = a² + b² = 3² + 4² = 9 + 16 = 25. c = √25 = 5 cm." },
        2: { question: "A right-angled triangle has hypotenuse 13 cm and one leg 5 cm. Find the other leg.", walkthrough: "b² = c² − a² = 13² − 5² = 169 − 25 = 144. b = √144 = 12 cm." },
        3: { question: "A 10 m ladder leans against a wall with its foot 6 m from the wall. How high up the wall does it reach?", walkthrough: "The ladder is the hypotenuse: height² = 10² − 6² = 100 − 36 = 64. height = √64 = 8 m." },
      },
    }, [
      num(1, "A right-angled triangle has legs 3 cm and 4 cm. Find the hypotenuse, in cm.", 5, "c² = 3² + 4² = 9 + 16 = 25, so c = √25 = 5 cm."),
      num(1, "A right-angled triangle has legs 6 cm and 8 cm. Find the hypotenuse, in cm.", 10, "c² = 6² + 8² = 36 + 64 = 100, so c = √100 = 10 cm."),
      num(1, "A right-angled triangle has legs 5 cm and 12 cm. Find the hypotenuse, in cm.", 13, "c² = 5² + 12² = 25 + 144 = 169, so c = √169 = 13 cm."),
      num(1, "A right-angled triangle has legs 9 cm and 12 cm. Find the hypotenuse, in cm.", 15, "c² = 9² + 12² = 81 + 144 = 225, so c = √225 = 15 cm."),
      num(1, "A right-angled triangle has legs 8 cm and 15 cm. Find the hypotenuse, in cm.", 17, "c² = 8² + 15² = 64 + 225 = 289, so c = √289 = 17 cm."),
      mc(1, "What is the longest side of a right-angled triangle called?", ["The hypotenuse", "The adjacent", "The opposite", "The base"], "The hypotenuse is always the longest side, opposite the right angle."),
      num(2, "A right-angled triangle has hypotenuse 10 cm and one leg 6 cm. Find the other leg, in cm.", 8, "b² = 10² − 6² = 100 − 36 = 64, so b = √64 = 8 cm."),
      num(2, "A right-angled triangle has hypotenuse 15 cm and one leg 9 cm. Find the other leg, in cm.", 12, "b² = 15² − 9² = 225 − 81 = 144, so b = √144 = 12 cm."),
      num(2, "A right-angled triangle has hypotenuse 25 cm and one leg 7 cm. Find the other leg, in cm.", 24, "b² = 25² − 7² = 625 − 49 = 576, so b = √576 = 24 cm."),
      num(2, "A right-angled triangle has hypotenuse 17 cm and one leg 8 cm. Find the other leg, in cm.", 15, "b² = 17² − 8² = 289 − 64 = 225, so b = √225 = 15 cm."),
      num(2, "A rectangle is 5 cm by 12 cm. Find the length of its diagonal, in cm.", 13, "The diagonal is the hypotenuse of a right triangle with legs 5 and 12: √(5² + 12²) = √169 = 13 cm."),
      mc(2, "Which equation is Pythagoras' theorem?", ["a² + b² = c²", "a + b = c", "a² − b² = c²", "a × b = c"], "The sum of the squares of the two shorter sides equals the square of the hypotenuse."),
      num(3, "A right-angled triangle has legs 7 cm and 24 cm. Find the hypotenuse, in cm.", 25, "c² = 7² + 24² = 49 + 576 = 625, so c = √625 = 25 cm."),
      num(3, "A 13 m ladder leans against a wall with its foot 5 m from the wall. How high up the wall does it reach, in m?", 12, "height² = 13² − 5² = 169 − 25 = 144, so height = √144 = 12 m."),
      num(3, "An old TV screen is 24 inches wide and 18 inches tall. Find its diagonal size, in inches.", 30, "diagonal² = 24² + 18² = 576 + 324 = 900, so diagonal = √900 = 30 inches."),
      num(3, "A right-angled triangle has hypotenuse 20 cm and one leg 12 cm. Find the other leg, in cm.", 16, "b² = 20² − 12² = 400 − 144 = 256, so b = √256 = 16 cm."),
      mc(3, "A triangle has sides 9 cm, 12 cm and 15 cm. Is it right-angled?", ["True", "False"], "9² + 12² = 81 + 144 = 225 = 15², so yes — it fits Pythagoras' theorem."),
      num(3, "A square has side length 10 cm. Find the length of its diagonal, in cm, to 1 decimal place.", 14.1, "The diagonal splits the square into two right triangles with legs 10 and 10: √(10² + 10²) = √200 ≈ 14.1 cm.", 0.1),
    ]),
    make("y8-linear-graphs", "Linear Equations and Graphs", "📈", {
      blurb: "Solving harder equations (brackets, both sides) and working with gradients and intercepts.",
      recap: "Solving multi-step linear equations, and finding the gradient and intercepts of a straight-line graph y = mx + c.",
      example: "A phone plan's cost graph is a straight line — the gradient is the per-GB charge and the y-intercept is the flat monthly fee.",
      workedExample: {
        1: { question: "Solve 2(x + 3) = 3(x − 1).", walkthrough: "Expand both sides: 2x + 6 = 3x − 3. Collect: 6 + 3 = 3x − 2x, so x = 9. Check: 2(12) = 24 and 3(8) = 24. ✓" },
        2: { question: "Find the gradient of the line through (1, 2) and (3, 8).", walkthrough: "Gradient = (change in y) ÷ (change in x) = (8 − 2) ÷ (3 − 1) = 6 ÷ 2 = 3." },
        3: { question: "Find the x- and y-intercepts of y = 2x − 6.", walkthrough: "y-intercept: set x = 0, so y = −6. x-intercept: set y = 0, so 2x = 6 and x = 3." },
      },
    }, [
      num(1, "Solve: 2(x + 4) = 18. What is x?", 5, "x + 4 = 9 (dividing both sides by 2), so x = 5."),
      num(1, "Solve: 3x + 5 = 20. What is x?", 5, "3x = 15, so x = 5."),
      num(1, "Find the gradient of the line through (0, 1) and (2, 5).", 2, "Gradient = (5 − 1) ÷ (2 − 0) = 4 ÷ 2 = 2."),
      num(1, "What is the y-intercept of y = 4x + 7?", 7, "The y-intercept is the constant term, c, when x = 0: 7."),
      num(1, "What is the x-intercept of y = x − 6?", 6, "Set y = 0: 0 = x − 6, so x = 6."),
      mc(1, "In y = mx + c, what does m represent?", ["The gradient (steepness)", "The y-intercept", "The x-intercept", "A point on the line"], "m is the gradient — how much y changes for every 1 unit x increases."),
      num(2, "Solve: 2(x − 3) = 3(x − 5). What is x?", 9, "2x − 6 = 3x − 15. Collect: −6 + 15 = 3x − 2x, so x = 9."),
      num(2, "Solve: 5x − 2 = 2x + 13. What is x?", 5, "3x = 15, so x = 5."),
      num(2, "Find the gradient of the line through (−1, 4) and (3, −4).", -2, "Gradient = (−4 − 4) ÷ (3 − (−1)) = −8 ÷ 4 = −2."),
      num(2, "A line has gradient 4 and passes through (2, 9). What is its y-intercept?", 1, "9 = 4(2) + c, so 9 = 8 + c, giving c = 1."),
      num(2, "Find the x-intercept of y = 3x − 12.", 4, "Set y = 0: 0 = 3x − 12, so x = 4."),
      mc(2, "Which line is steeper?", ["y = 5x + 1", "y = 2x + 9"], "The gradient of y = 5x + 1 is 5, which is bigger than 2."),
      num(3, "Solve: (x + 2) / 3 = 5. What is x?", 13, "Multiply both sides by 3: x + 2 = 15, so x = 13."),
      num(3, "Solve: (2x + 6) / 4 = 5. What is x?", 7, "Multiply both sides by 4: 2x + 6 = 20, so 2x = 14 and x = 7."),
      num(3, "Solve: 4(x − 1) − 2(x + 3) = 10. What is x?", 10, "Expand: 4x − 4 − 2x − 6 = 10, so 2x − 10 = 10, giving 2x = 20 and x = 10."),
      num(3, "A line passes through (2, 5) and (6, 13). Find its gradient.", 2, "Gradient = (13 − 5) ÷ (6 − 2) = 8 ÷ 4 = 2."),
      num(3, "A line has gradient −2 and passes through (3, 1). What is its y-intercept?", 7, "1 = −2(3) + c, so 1 = −6 + c, giving c = 7."),
      mc(3, "A line is parallel to y = 3x − 1. What is the gradient of any line parallel to it?", ["3", "−1", "1/3", "−3"], "Parallel lines always have the same gradient."),
    ]),
  ];

  // ================================================================ Year 9
  const year9 = [
    make("y9-trig", "Trigonometry", "🔺", {
      blurb: "Using sine, cosine and tangent (SOH CAH TOA) to find missing sides and angles in right-angled triangles.",
      recap: "SOH CAH TOA links an angle in a right-angled triangle to the ratio between two of its sides, letting you find a missing side or a missing angle.",
      example: "Surveyors and pilots use trigonometry to work out heights and distances they can't measure directly, like the height of a cliff from its angle of elevation.",
      workedExample: {
        1: { question: "A right-angled triangle has a 30° angle and hypotenuse 10 cm. Find the opposite side.", walkthrough: "Opposite = hypotenuse × sin(angle) = 10 × sin(30°) = 10 × 0.5 = 5 cm." },
        2: { question: "A right-angled triangle has a 60° angle and adjacent side 8 cm. Find the hypotenuse.", walkthrough: "Adjacent = hypotenuse × cos(angle), so hypotenuse = adjacent ÷ cos(60°) = 8 ÷ 0.5 = 16 cm." },
        3: { question: "A right-angled triangle has opposite 7 cm and adjacent 7 cm. Find the angle.", walkthrough: "tan(angle) = opposite ÷ adjacent = 7 ÷ 7 = 1. angle = tan⁻¹(1) = 45°." },
      },
    }, [
      mc(1, "Which ratio does SOH stand for?", ["Sin = Opposite ÷ Hypotenuse", "Sin = Adjacent ÷ Hypotenuse", "Sin = Opposite ÷ Adjacent", "Sin = Hypotenuse ÷ Opposite"], "SOH: Sine = Opposite over Hypotenuse."),
      mc(1, "Which ratio does CAH stand for?", ["Cos = Adjacent ÷ Hypotenuse", "Cos = Opposite ÷ Hypotenuse", "Cos = Opposite ÷ Adjacent", "Cos = Hypotenuse ÷ Adjacent"], "CAH: Cosine = Adjacent over Hypotenuse."),
      mc(1, "Which ratio does TOA stand for?", ["Tan = Opposite ÷ Adjacent", "Tan = Adjacent ÷ Opposite", "Tan = Opposite ÷ Hypotenuse", "Tan = Hypotenuse ÷ Opposite"], "TOA: Tangent = Opposite over Adjacent."),
      num(1, "A right-angled triangle has hypotenuse 10 cm and a 30° angle. Using sin(30°) = 0.5, find the opposite side, in cm.", 5, "Opposite = hypotenuse × sin(30°) = 10 × 0.5 = 5 cm."),
      num(1, "A right-angled triangle has adjacent side 12 cm and a 60° angle. Using cos(60°) = 0.5, find the hypotenuse, in cm.", 24, "Hypotenuse = adjacent ÷ cos(60°) = 12 ÷ 0.5 = 24 cm."),
      mc(2, "A right-angled triangle's 40° angle has a given 'opposite' side. Relative to the OTHER acute angle (50°), what does that same side become?", ["The adjacent side", "The hypotenuse", "Still the opposite side", "It isn't a side of the triangle"], "Opposite and adjacent swap depending on which angle you're looking from."),
      num(2, "A right-angled triangle has hypotenuse 20 cm and a 30° angle. Using cos(30°) ≈ 0.87, find the adjacent side, to the nearest whole number (cm).", 17, "Adjacent = 20 × cos(30°) ≈ 20 × 0.866 ≈ 17.3, which rounds to 17 cm.", 0.5),
      num(2, "A right-angled triangle has opposite side 9 cm and a 45° angle. Using sin(45°) ≈ 0.71, find the hypotenuse, to the nearest whole number (cm).", 13, "Hypotenuse = 9 ÷ sin(45°) ≈ 9 ÷ 0.707 ≈ 12.7, which rounds to 13 cm.", 0.5),
      num(2, "A right-angled triangle has adjacent side 15 cm and a 60° angle. Using tan(60°) ≈ 1.73, find the opposite side, to the nearest whole number (cm).", 26, "Opposite = adjacent × tan(60°) ≈ 15 × 1.732 ≈ 26.0 cm.", 0.5),
      num(2, "A right-angled triangle has hypotenuse 18 cm and a 60° angle. Using sin(60°) ≈ 0.87, find the opposite side, to the nearest whole number (cm).", 16, "Opposite = 18 × sin(60°) ≈ 18 × 0.866 ≈ 15.6, which rounds to 16 cm.", 0.5),
      num(3, "A right-angled triangle has opposite side 5 cm and hypotenuse 10 cm. Find the angle, to the nearest whole degree.", 30, "sin(angle) = 5 ÷ 10 = 0.5, so angle = sin⁻¹(0.5) = 30°.", 1),
      num(3, "A right-angled triangle has opposite side 8.66 cm and adjacent side 5 cm. Find the angle, to the nearest whole degree.", 60, "tan(angle) = 8.66 ÷ 5 ≈ 1.732, so angle = tan⁻¹(1.732) ≈ 60°.", 1),
      num(3, "A 15 m ladder reaches 12 m up a wall. Find the angle the ladder makes with the ground, to the nearest whole degree.", 53, "sin(angle) = 12 ÷ 15 = 0.8, so angle = sin⁻¹(0.8) ≈ 53°.", 1),
      num(3, "From a point 50 m from the base of a tower, the angle of elevation to the top is 30°. Find the tower's height, to the nearest metre.", 29, "height = 50 × tan(30°) ≈ 50 × 0.577 ≈ 28.9, which rounds to 29 m.", 1),
      num(3, "A right-angled triangle has hypotenuse 13 cm and adjacent side 5 cm. Find the angle between them, to the nearest whole degree.", 67, "cos(angle) = 5 ÷ 13 ≈ 0.385, so angle = cos⁻¹(0.385) ≈ 67°.", 1),
    ]),
    make("y9-simultaneous", "Simultaneous Equations", "⚖️", {
      blurb: "Solving two linear equations at once, by elimination or substitution.",
      recap: "Simultaneous equations have two unknowns and two equations; solving them finds the single point (x, y) where both are true at once — where their graphs cross.",
      example: "A business breaks even where its cost line and revenue line cross — that crossing point is the solution to two simultaneous equations.",
      workedExample: {
        1: { question: "Solve x + y = 10 and x − y = 2.", walkthrough: "Add the equations: 2x = 12, so x = 6. Substitute back: 6 + y = 10, so y = 4." },
        2: { question: "Solve y = 2x + 1 and y = x + 4.", walkthrough: "Since both equal y, set them equal: 2x + 1 = x + 4, so x = 3. Then y = 3 + 4 = 7." },
        3: { question: "Solve 2x + y = 11 and x − y = 1.", walkthrough: "Add the equations: 3x = 12, so x = 4. Substitute: 4 − y = 1, so y = 3." },
      },
    }, [
      num(1, "Solve: x + y = 10 and x − y = 4. What is x?", 7, "Add the equations: 2x = 14, so x = 7."),
      num(1, "Solve: x + y = 10 and x − y = 4. What is y?", 3, "Using x = 7: 7 + y = 10, so y = 3."),
      num(1, "Solve: y = x + 3 and y = 2x. What is x?", 3, "Set them equal: x + 3 = 2x, so x = 3."),
      num(1, "Solve: y = x + 3 and y = 2x. What is y?", 6, "Using x = 3: y = 2(3) = 6."),
      num(1, "Solve: 2x + y = 12 and y = x. What is x?", 4, "Substitute y = x: 2x + x = 12, so 3x = 12 and x = 4."),
      num(2, "Solve: x + y = 15 and x − y = 5. What is x?", 10, "Add the equations: 2x = 20, so x = 10."),
      num(2, "Solve: x + y = 15 and x − y = 5. What is y?", 5, "Using x = 10: 10 + y = 15, so y = 5."),
      num(2, "Solve: 3x + y = 20 and y = x + 4. What is x?", 4, "Substitute: 3x + x + 4 = 20, so 4x = 16 and x = 4."),
      num(2, "Solve: 3x + y = 20 and y = x + 4. What is y?", 8, "Using x = 4: y = 4 + 4 = 8."),
      num(2, "Solve: 2x + 3y = 16 and x = 2. What is y?", 4, "Substitute x = 2: 4 + 3y = 16, so 3y = 12 and y = 4."),
      num(3, "Solve: 2x + y = 11 and x − y = 1. What is x?", 4, "Add the equations: 3x = 12, so x = 4."),
      num(3, "Solve: 2x + y = 11 and x − y = 1. What is y?", 3, "Using x = 4: 4 − y = 1, so y = 3."),
      num(3, "Solve: 3x − 2y = 4 and x + 2y = 12. What is x?", 4, "Add the equations: 4x = 16, so x = 4."),
      num(3, "Solve: 3x − 2y = 4 and x + 2y = 12. What is y?", 4, "Using x = 4: 4 + 2y = 12, so 2y = 8 and y = 4."),
      pt(3, "Solve the simultaneous equations y = 3x − 1 and y = x + 5. Give your answer as (x, y).", 3, 8, "Set them equal: 3x − 1 = x + 5, so 2x = 6 and x = 3. Then y = 3 + 5 = 8."),
    ]),
  ];

  // ================================================================ Year 10
  const year10 = [
    make("y10-quadratics", "Quadratic Equations", "✖️", {
      blurb: "Expanding brackets, factorising, and solving quadratic equations.",
      recap: "A quadratic has an x² term. Expand brackets to write it in full, factorise to write it as two brackets multiplied, and use the null factor law (or the quadratic formula) to solve it.",
      example: "The path of a thrown ball is a parabola — a quadratic equation finds exactly when and where it lands.",
      workedExample: {
        1: { question: "Expand (x + 3)(x + 5).", walkthrough: "x × x = x². x × 5 = 5x. 3 × x = 3x. 3 × 5 = 15. Add the middle terms: x² + 8x + 15." },
        2: { question: "Factorise x² + 7x + 12.", walkthrough: "Find two numbers that multiply to 12 and add to 7: 3 and 4. So x² + 7x + 12 = (x + 3)(x + 4)." },
        3: { question: "Solve x² − 5x + 6 = 0 by factorising.", walkthrough: "Factorise: (x − 2)(x − 3) = 0. By the null factor law, x − 2 = 0 or x − 3 = 0, so x = 2 or x = 3." },
      },
    }, [
      num(1, "Expand (x + 2)(x + 6). What is the coefficient of x (the number in front of it)?", 8, "The coefficient of x is 2 + 6 = 8."),
      num(1, "Expand (x + 2)(x + 6). What is the constant term?", 12, "The constant term is 2 × 6 = 12."),
      num(1, "Expand (x + 4)(x − 1). What is the coefficient of x?", 3, "The coefficient of x is 4 + (−1) = 3."),
      num(1, "Expand (x + 4)(x − 1). What is the constant term?", -4, "The constant term is 4 × (−1) = −4."),
      mc(1, "Which pair of factors multiplies to give x² + 9x + 20?", ["(x + 4)(x + 5)", "(x + 2)(x + 10)", "(x + 1)(x + 20)", "(x + 5)(x + 5)"], "4 × 5 = 20 and 4 + 5 = 9, matching both the constant and the middle term."),
      num(2, "Solve x² − 5x + 6 = 0 by factorising: (x − 2)(x − 3) = 0. What is the smaller solution for x?", 2, "The solutions are x = 2 and x = 3 — the smaller one is 2."),
      num(2, "Solve x² − 5x + 6 = 0. What is the larger solution for x?", 3, "The solutions are x = 2 and x = 3 — the larger one is 3."),
      num(2, "Solve x² + 7x + 12 = 0: (x + 3)(x + 4) = 0. What is the smaller solution for x?", -4, "The solutions are x = −3 and x = −4 — the smaller one is −4."),
      num(2, "Solve x² + 7x + 12 = 0. What is the larger solution for x?", -3, "The solutions are x = −3 and x = −4 — the larger one is −3."),
      num(2, "Solve x² − 9 = 0. What is the positive solution for x?", 3, "x² = 9, so x = 3 or x = −3. The positive solution is 3."),
      num(3, "Solve x² − 2x − 8 = 0: (x − 4)(x + 2) = 0. What is the larger solution for x?", 4, "The solutions are x = 4 and x = −2 — the larger one is 4."),
      num(3, "Solve x² − 2x − 8 = 0. What is the smaller solution for x?", -2, "The solutions are x = 4 and x = −2 — the smaller one is −2."),
      num(3, "Use the quadratic formula to solve x² + 4x + 3 = 0 (a = 1, b = 4, c = 3). What is the larger solution for x?", -1, "Discriminant = 4² − 4(1)(3) = 4. x = (−4 ± 2) ÷ 2, giving x = −1 or x = −3. The larger is −1."),
      num(3, "A ball's height is h = −x² + 6x (x = time). At what positive time x does the ball return to height 0?", 6, "Factorise: −x(x − 6) = 0, so x = 0 or x = 6. The positive answer (other than the start) is 6."),
      num(3, "Use the quadratic formula to solve 2x² − 3x − 2 = 0 (a = 2, b = −3, c = −2). What is the larger solution for x?", 2, "Discriminant = (−3)² − 4(2)(−2) = 9 + 16 = 25. x = (3 ± 5) ÷ 4, giving x = 2 or x = −0.5. The larger is 2."),
    ]),
    make("y10-surds", "Surds and Indices", "√", {
      blurb: "Simplifying and combining surds, and using the index laws.",
      recap: "A surd is a root that can't be simplified to a whole number, like √2. Simplify surds by pulling out square factors, and use the index laws to work with powers.",
      example: "Surds show up in exact answers for things like the diagonal of a square or the height of an equilateral triangle, where a decimal would only be an approximation.",
      workedExample: {
        1: { question: "Simplify √50.", walkthrough: "Find the largest square factor of 50: 25 × 2. √50 = √25 × √2 = 5√2." },
        2: { question: "Simplify 3√2 + 5√2.", walkthrough: "These are 'like surds' (both √2), so just add the numbers in front: 3 + 5 = 8, giving 8√2." },
        3: { question: "Simplify (2√3) × (4√3).", walkthrough: "Multiply the numbers: 2 × 4 = 8. Multiply the surds: √3 × √3 = 3. Result: 8 × 3 = 24." },
      },
    }, [
      num(1, "Simplify √50 = a√2. What is a?", 5, "50 = 25 × 2, and √25 = 5, so √50 = 5√2."),
      num(1, "Simplify √18 = a√2. What is a?", 3, "18 = 9 × 2, and √9 = 3, so √18 = 3√2."),
      num(1, "Simplify √45 = a√5. What is a?", 3, "45 = 9 × 5, and √9 = 3, so √45 = 3√5."),
      num(1, "Simplify 2√3 + 5√3 = a√3. What is a?", 7, "They're like surds, so add the numbers in front: 2 + 5 = 7."),
      num(1, "Simplify 9√2 − 4√2 = a√2. What is a?", 5, "They're like surds, so subtract the numbers in front: 9 − 4 = 5."),
      num(2, "Simplify √72 = a√2. What is a?", 6, "72 = 36 × 2, and √36 = 6, so √72 = 6√2."),
      num(2, "Simplify (3√2) × (5√2).", 30, "Multiply the numbers: 3 × 5 = 15. Multiply the surds: √2 × √2 = 2. Result: 15 × 2 = 30."),
      num(2, "Simplify (2√5) × (3√5).", 30, "Multiply the numbers: 2 × 3 = 6. Multiply the surds: √5 × √5 = 5. Result: 6 × 5 = 30."),
      num(2, "Simplify 3√8 = a√2 (hint: first simplify √8). What is a?", 6, "√8 = 2√2, so 3√8 = 3 × 2√2 = 6√2."),
      num(2, "Write 2³ × 2² as a single power of 2. What is the exponent?", 5, "The index law a^m × a^n = a^(m+n) gives 2^(3+2) = 2⁵."),
      num(3, "Simplify (4√3) × (2√6) = a√2. What is a?", 24, "√3 × √6 = √18 = 3√2. Then 4 × 2 = 8, and 8 × 3 = 24, giving 24√2."),
      num(3, "Simplify √2 + √8 = a√2 (hint: first simplify √8). What is a?", 3, "√8 = 2√2, so √2 + 2√2 = 3√2."),
      num(3, "Write 5⁻² as a fraction, 1/n. What is n?", 25, "A negative index flips it to a fraction: 5⁻² = 1 ÷ 5² = 1/25."),
      num(3, "What is 16^(1/2)?", 4, "A power of 1/2 means the square root: √16 = 4."),
      num(3, "What is 27^(1/3)?", 3, "A power of 1/3 means the cube root: ∛27 = 3, since 3 × 3 × 3 = 27."),
    ]),
  ];

  // ================================================================ VCE (Units 1-2 starter)
  const vce = [
    make("vce-functions", "Linear and Quadratic Functions", "ƒ", {
      blurb: "Function notation, and the key features of quadratic graphs — the turning point and the discriminant.",
      recap: "Functions are written f(x); substitute a value for x to evaluate it. For a quadratic y = ax² + bx + c, the turning point's x-coordinate is −b ÷ (2a), and the discriminant b² − 4ac tells you how many x-intercepts the graph has.",
      example: "Engineers use quadratic functions to model the shape of a cable on a bridge, or the path of a water jet from a fountain.",
      workedExample: {
        1: { question: "If f(x) = 3x − 2, find f(4).", walkthrough: "Substitute x = 4: f(4) = 3(4) − 2 = 12 − 2 = 10." },
        2: { question: "Find the turning point's x-coordinate of y = x² − 6x + 5.", walkthrough: "Using x = −b ÷ (2a) with a = 1, b = −6: x = 6 ÷ 2 = 3." },
        3: { question: "For y = 2x² − 4x + 1, find the discriminant and state how many x-intercepts the graph has.", walkthrough: "Discriminant = b² − 4ac = (−4)² − 4(2)(1) = 16 − 8 = 8. Since 8 > 0, the graph has 2 x-intercepts." },
      },
    }, [
      num(1, "f(x) = 3x − 2. Find f(4).", 10, "f(4) = 3(4) − 2 = 12 − 2 = 10."),
      num(1, "f(x) = 3x − 2. Find f(0).", -2, "f(0) = 3(0) − 2 = −2."),
      num(1, "f(x) = −2x + 5. Find f(3).", -1, "f(3) = −2(3) + 5 = −6 + 5 = −1."),
      num(1, "For y = x² − 6x + 5, using x = −b ÷ (2a), find the x-coordinate of the turning point.", 3, "a = 1, b = −6, so x = 6 ÷ 2 = 3."),
      mc(1, "The graph of a quadratic function is called a…", ["Parabola", "Hyperbola", "Straight line", "Circle"], "Every quadratic graphs as a U-shaped (or upside-down U) curve called a parabola."),
      num(2, "f(x) = 2x² − 3. Find f(2).", 5, "f(2) = 2(4) − 3 = 8 − 3 = 5."),
      num(2, "f(x) = 2x² − 3. Find f(−2).", 5, "f(−2) = 2(4) − 3 = 5 (squaring removes the negative)."),
      num(2, "For y = x² − 4x + 1, find the x-coordinate of the turning point.", 2, "a = 1, b = −4, so x = 4 ÷ 2 = 2."),
      num(2, "For y = x² − 4x + 1, find the y-coordinate of the turning point (x = 2).", -3, "Substitute x = 2: y = 4 − 8 + 1 = −3."),
      num(2, "Find the discriminant of 2x² + 4x + 2 = 0 (b² − 4ac).", 0, "Discriminant = 4² − 4(2)(2) = 16 − 16 = 0."),
      num(3, "For y = 2x² − 4x + 1, find the discriminant.", 8, "Discriminant = (−4)² − 4(2)(1) = 16 − 8 = 8."),
      num(3, "Using the discriminant from the previous question (8 > 0), how many x-intercepts does the parabola have?", 2, "A positive discriminant always means 2 x-intercepts."),
      num(3, "For y = x² + 2x + 5, find the discriminant.", -16, "Discriminant = 2² − 4(1)(5) = 4 − 20 = −16."),
      num(3, "Based on that negative discriminant, how many real x-intercepts does the parabola have?", 0, "A negative discriminant means the graph never crosses the x-axis — 0 x-intercepts."),
      num(3, "f(x) = x² − 5x + 6. Solve f(x) = 0 for the larger value of x.", 3, "Factorise: (x − 2)(x − 3) = 0, so x = 2 or x = 3. The larger is 3."),
    ]),
    make("vce-probstats", "Probability and Statistics", "🎲", {
      blurb: "The addition and multiplication rules for probability, and expected value.",
      recap: "P(A or B) = P(A) + P(B) − P(A and B). For independent events, P(A and B) = P(A) × P(B). Expected value is the long-run average outcome.",
      example: "Casinos and insurance companies rely entirely on expected value — it's how they make sure they come out ahead over many bets or policies.",
      workedExample: {
        1: { question: "P(A) = 0.3 and P(B) = 0.5, and A and B can't both happen (mutually exclusive). Find P(A or B).", walkthrough: "For mutually exclusive events, just add: P(A or B) = 0.3 + 0.5 = 0.8." },
        2: { question: "A fair die is rolled twice. Find P(both rolls are 6).", walkthrough: "The rolls are independent, so multiply: P(6) × P(6) = (1/6) × (1/6) = 1/36 ≈ 0.028." },
        3: { question: "A game costs $2 to play. You win $10 with probability 0.2, otherwise nothing. Find the expected profit.", walkthrough: "Expected winnings = 0.2 × $10 = $2. Expected profit = winnings − cost = $2 − $2 = $0." },
      },
    }, [
      num(1, "P(A) = 0.4. Find P(not A), as a decimal.", 0.6, "The complement rule: P(not A) = 1 − P(A) = 1 − 0.4 = 0.6."),
      num(1, "P(A) = 0.3 and P(B) = 0.5 (mutually exclusive). Find P(A or B), as a decimal.", 0.8, "For mutually exclusive events, add: 0.3 + 0.5 = 0.8."),
      num(1, "A coin is flipped twice. Find P(both heads), as a decimal.", 0.25, "Independent events: 0.5 × 0.5 = 0.25."),
      num(1, "A die is rolled once. Find P(rolling an odd number), as a decimal.", 0.5, "There are 3 odd numbers (1, 3, 5) out of 6: 3/6 = 0.5."),
      num(1, "A bag has 4 red and 6 blue marbles. Find P(red), as a decimal.", 0.4, "4 out of 10 marbles are red: 4/10 = 0.4."),
      num(2, "P(A) = 0.6, P(B) = 0.3, P(A and B) = 0.1. Find P(A or B), as a decimal.", 0.8, "P(A or B) = P(A) + P(B) − P(A and B) = 0.6 + 0.3 − 0.1 = 0.8."),
      num(2, "Two fair dice are rolled (independent). Find P(both show an even number), as a decimal.", 0.25, "P(even) = 0.5 for each die, so 0.5 × 0.5 = 0.25."),
      num(2, "P(A) = 0.7. Find P(not A), as a decimal.", 0.3, "1 − 0.7 = 0.3."),
      num(2, "A spinner has 5 equal sections: 2 red, 3 blue. For two independent spins, find P(red then blue), as a decimal.", 0.24, "P(red) × P(blue) = (2/5) × (3/5) = 6/25 = 0.24."),
      num(2, "A game costs $5. You win $20 with probability 0.1, otherwise nothing. Find the expected value of your winnings, as a decimal.", 2, "Expected winnings = 0.1 × $20 = $2."),
      num(3, "Using the game from the previous question (cost $5, expected winnings $2), find the expected profit (winnings − cost).", -3, "Expected profit = $2 − $5 = −$3."),
      num(3, "P(A) = 0.5, P(B) = 0.4, P(A and B) = 0.2. Find P(A or B), as a decimal.", 0.7, "P(A or B) = 0.5 + 0.4 − 0.2 = 0.7."),
      num(3, "Find P(three independent coin flips are all heads), as a decimal.", 0.125, "0.5 × 0.5 × 0.5 = 0.125."),
      num(3, "A 4-question multiple-choice test has 5 options per question with one correct answer; you guess every question. Find P(all 4 correct), as a decimal.", 0.0016, "(1/5)⁴ = 1/625 = 0.0016.", 0.0002),
      num(3, "P(A) = 0.8 in each of two independent trials. Find P(at least one success), as a decimal.", 0.96, "P(no success in one trial) = 0.2, so P(no success in both) = 0.2 × 0.2 = 0.04. P(at least one) = 1 − 0.04 = 0.96."),
    ]),
  ];

  YEAR_LEVELS.push(
    { id: "8", shortLabel: "Y8", label: "Year 8", icon: "8", blurb: "Building on Year 7 with harder equations, Pythagoras' theorem and more.", topics: year8 },
    { id: "9", shortLabel: "Y9", label: "Year 9", icon: "9", blurb: "Trigonometry and simultaneous equations.", topics: year9 },
    { id: "10", shortLabel: "Y10", label: "Year 10", icon: "10", blurb: "Quadratic equations, surds and indices — getting ready for VCE.", topics: year10 },
    { id: "vce", shortLabel: "VCE", label: "VCE", icon: "🎓", blurb: "A starter set of VCE Units 1-2 topics: functions and probability. More to come.", topics: vce },
  );

  Object.assign(TOPIC_LESSONS, {
    "y8-pythagoras": [
      { title: "What is Pythagoras' theorem?", text: "In any right-angled triangle, a² + b² = c², where c is the hypotenuse (the longest side, opposite the right angle) and a, b are the other two sides.",
        points: ["Always check which side is the hypotenuse first — it's opposite the right angle.", "3-4-5, 6-8-10 and 5-12-13 are common 'Pythagorean triples' worth recognising."] },
      { title: "Finding the hypotenuse", text: "Square both shorter sides, add them, then take the square root.",
        points: ["Legs 3 and 4: 3² + 4² = 9 + 16 = 25. √25 = 5."] },
      { title: "Finding a shorter side", text: "Rearrange: a² = c² − b². Square the hypotenuse, subtract the known leg's square, then take the square root.",
        points: ["Hypotenuse 13, leg 5: 13² − 5² = 169 − 25 = 144. √144 = 12."],
        tip: "If you're not sure whether to add or subtract, remember: the hypotenuse is always the biggest number." },
    ],
    "y8-linear-graphs": [
      { title: "Solving harder equations", points: ["Expand any brackets first.", "Collect like terms, moving pronumerals to one side and numbers to the other.", "Divide at the very end to isolate x."] },
      { title: "Gradient", text: "Gradient = (change in y) ÷ (change in x), between any two points on the line.",
        points: ["A positive gradient slopes up to the right; a negative gradient slopes down to the right.", "A bigger gradient (ignoring sign) means a steeper line."] },
      { title: "Intercepts", points: ["y-intercept: set x = 0 and solve for y.", "x-intercept: set y = 0 and solve for x.", "In y = mx + c, c is always the y-intercept."] },
    ],
    "y9-trig": [
      { title: "SOH CAH TOA", points: ["Sin(angle) = Opposite ÷ Hypotenuse", "Cos(angle) = Adjacent ÷ Hypotenuse", "Tan(angle) = Opposite ÷ Adjacent"],
        tip: "Label the sides relative to the angle you're using first — opposite and adjacent swap if you use the other acute angle." },
      { title: "Finding a missing side", points: ["Pick the ratio that links the angle, the side you know, and the side you want.", "Rearrange to make the unknown side the subject before calculating."] },
      { title: "Finding a missing angle", text: "Use the inverse function: sin⁻¹, cos⁻¹ or tan⁻¹, on whichever ratio you can calculate from the two known sides.",
        points: ["e.g. if opposite = 5 and hypotenuse = 10, sin(angle) = 0.5, so angle = sin⁻¹(0.5) = 30°."] },
    ],
    "y9-simultaneous": [
      { title: "What are simultaneous equations?", text: "Two equations with two unknowns (usually x and y), both true at the same time — the solution is the one (x, y) pair that fits both.",
        points: ["Graphically, it's the point where the two lines cross."] },
      { title: "Elimination", points: ["Line the equations up, then add or subtract them to cancel out one variable.", "If the signs are the same, subtract; if opposite, add.", "Solve for the remaining variable, then substitute back to find the other."] },
      { title: "Substitution", points: ["Use one equation to write one variable in terms of the other (e.g. y = x + 3).", "Substitute that into the other equation and solve.", "Substitute the answer back in to find the second variable."] },
    ],
    "y10-quadratics": [
      { title: "Expanding brackets", text: "Multiply every term in the first bracket by every term in the second, then collect like terms.",
        points: ["(x + a)(x + b) = x² + (a + b)x + ab."] },
      { title: "Factorising", text: "To factorise x² + bx + c, find two numbers that multiply to c and add to b.",
        points: ["x² + 7x + 12: need two numbers multiplying to 12, adding to 7 → 3 and 4 → (x + 3)(x + 4)."] },
      { title: "Solving by factorising", text: "Once factorised and equal to 0, use the null factor law: if two things multiply to 0, one of them must be 0.",
        points: ["(x − 2)(x − 3) = 0 means x − 2 = 0 or x − 3 = 0, so x = 2 or x = 3."] },
      { title: "The quadratic formula", text: "For ax² + bx + c = 0, x = (−b ± √(b² − 4ac)) ÷ (2a). Use it when factorising doesn't work neatly.",
        tip: "b² − 4ac is called the discriminant — it also tells you how many solutions there are." },
    ],
    "y10-surds": [
      { title: "What is a surd?", text: "A surd is a root (like √2 or √5) that can't be simplified to a whole number — its decimal goes on forever without repeating.",
        points: ["√4 = 2 is NOT a surd (it's a whole number). √5 IS a surd."] },
      { title: "Simplifying surds", text: "Find the largest perfect-square factor, split it out, and take its square root.",
        points: ["√50 = √(25 × 2) = √25 × √2 = 5√2."] },
      { title: "Adding, subtracting and multiplying", points: ["Like surds (same number under the root) add and subtract like normal terms: 3√2 + 5√2 = 8√2.", "To multiply surds, multiply the numbers in front and multiply what's under the root: (2√3)(4√3) = 8 × 3 = 24."] },
      { title: "Index laws", points: ["a^m × a^n = a^(m+n) — adding powers when multiplying.", "a⁻ⁿ = 1 ÷ aⁿ — a negative power means 'one over'.", "a^(1/2) = √a and a^(1/3) = ∛a — fractional powers are roots."] },
    ],
    "vce-functions": [
      { title: "Function notation", text: "f(x) is just a rule for turning x into an output. To evaluate f(4), substitute 4 everywhere you see x.",
        points: ["f(x) = 3x − 2, so f(4) = 3(4) − 2 = 10."] },
      { title: "The turning point", text: "For y = ax² + bx + c, the turning point's x-coordinate is −b ÷ (2a). Substitute it back in to find the y-coordinate.",
        points: ["This is the minimum point if a > 0, or the maximum point if a < 0."] },
      { title: "The discriminant", text: "For ax² + bx + c = 0, the discriminant is b² − 4ac.",
        points: ["Positive: 2 x-intercepts.", "Zero: exactly 1 x-intercept (the graph just touches the x-axis).", "Negative: 0 x-intercepts (the graph never reaches the x-axis)."] },
    ],
    "vce-probstats": [
      { title: "The addition rule", text: "P(A or B) = P(A) + P(B) − P(A and B).",
        points: ["If A and B can never both happen (mutually exclusive), P(A and B) = 0, so you can just add P(A) + P(B)."] },
      { title: "The multiplication rule", text: "For independent events (one doesn't affect the other), P(A and B) = P(A) × P(B).",
        points: ["Rolling a die twice, or flipping separate coins, are independent."] },
      { title: "The complement rule", text: "P(not A) = 1 − P(A).",
        points: ["Useful for 'at least one' questions: P(at least one success) = 1 − P(no successes at all)."] },
      { title: "Expected value", text: "Expected value is the long-run average: multiply each outcome by its probability, then add them up.",
        points: ["A $10 win with probability 0.2 contributes 0.2 × $10 = $2 to the expected value."] },
    ],
  });
})();
