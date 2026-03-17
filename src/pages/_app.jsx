import { Outlet } from 'react-router'

function _layout() {
    return (
        <>
            <nav>Nav</nav>
            <Outlet />
        </>
    )
}

export default _layout
