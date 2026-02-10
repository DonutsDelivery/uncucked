import { GuildProvider } from '../../context/GuildContext.jsx';
import { SocketProvider } from '../../context/SocketContext.jsx';
import GuildList from '../Sidebar/GuildList.jsx';
import ChannelList from '../Sidebar/ChannelList.jsx';
import ChatArea from '../Messages/ChatArea.jsx';
import MemberList from '../Sidebar/MemberList.jsx';

export default function AppLayout() {
  return (
    <SocketProvider>
      <GuildProvider>
        <div className="h-screen flex overflow-hidden">
          {/* Guild sidebar - narrow icon strip */}
          <GuildList />

          {/* Channel sidebar */}
          <ChannelList />

          {/* Main chat area */}
          <ChatArea />

          {/* Member list - right sidebar */}
          <MemberList />
        </div>
      </GuildProvider>
    </SocketProvider>
  );
}
