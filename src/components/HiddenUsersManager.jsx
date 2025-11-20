import HiddenUserItem from './HiddenUserItem.jsx';
import { Card, CardHeader, CardContent, Typography, List } from '@mui/material';

function HiddenUsersManager({ hiddenUsers, onShowUser }) {
  return (
    <Card>
      <CardHeader 
        title="Gerenciar Usuários Ocultos"
        subheader="Aqui você pode voltar a ver os posts de usuários que ocultou."
      />
      <CardContent>
        {hiddenUsers.length > 0 ? (
          <List>
            {hiddenUsers.map(userId => (
              <HiddenUserItem 
                key={userId} 
                userId={userId} 
                onShowUser={onShowUser} 
              />
            ))}
          </List>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Você não está ocultando nenhum usuário no momento.
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

export default HiddenUsersManager;