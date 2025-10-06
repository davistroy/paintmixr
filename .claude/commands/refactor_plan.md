Here's a comprehensive prompt for Claude Code:

```
Perform a comprehensive technical debt audit and refactoring analysis of this web-based SaaS project. Create a detailed report in "REFACTOR-RECOMMENDATIONS.md" with the following structure:

## Analysis Scope
1. **Codebase Architecture**: Examine the overall project structure, separation of concerns, and architectural patterns. Identify any violations of SOLID principles or architectural anti-patterns.

2. **Code Quality Issues**: 
   - Identify duplicated code, overly complex functions (high cyclomatic complexity), and code smells
   - Find inconsistent coding patterns and style violations
   - Locate unused or dead code, commented-out code blocks
   - Check for proper error handling and logging practices

3. **Dependencies & Technical Debt**:
   - Audit all package dependencies for outdated, deprecated, or vulnerable packages
   - Identify dependency conflicts or redundancies
   - Check for unnecessary dependencies

4. **Performance & Scalability**:
   - Identify potential performance bottlenecks (N+1 queries, inefficient algorithms, memory leaks)
   - Examine database queries and indexing strategies
   - Review caching strategies and opportunities

5. **Security Concerns**:
   - Check for common security vulnerabilities (SQL injection, XSS, CSRF, etc.)
   - Review authentication and authorization implementations
   - Identify hardcoded secrets or sensitive data exposure

6. **Testing & Documentation**:
   - Assess test coverage and identify critical untested areas
   - Review documentation completeness and accuracy
   - Identify areas lacking comments or clear documentation

7. **Frontend/Backend Coupling**:
   - Analyze API design and consistency
   - Check for tight coupling between layers
   - Review state management approaches

## Output Format

For each section, provide:
- **Current State**: Brief description of what you found
- **Issues Identified**: Specific problems with file paths and line numbers where applicable
- **Impact**: Rate as Critical/High/Medium/Low
- **Recommended Actions**: Concrete, actionable steps to resolve
- **Estimated Effort**: Small/Medium/Large

End with:
- **Priority Matrix**: Issues sorted by impact vs. effort
- **Quick Wins**: High-impact, low-effort improvements to tackle first
- **Long-term Roadmap**: Larger refactoring efforts that should be planned

Be specific with file paths, function names, and code examples. Focus on actionable recommendations rather than theoretical concerns.
```

This prompt will give you a thorough, structured analysis that's both comprehensive and practical to work through systematically.